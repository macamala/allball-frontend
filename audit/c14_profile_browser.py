"""Candidate build + unchanged public API bytes; TARGET_SITE tests actual deploy."""
import os,json,subprocess,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('PROFILE_OUT','evidence'));out.mkdir(parents=True,exist_ok=True)
site=os.environ.get('TARGET_SITE','http://127.0.0.1:4173');server=None;report=[]
if '127.0.0.1' in site:
    server=subprocess.Popen(['node','node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],stdout=(out/'preview.log').open('w'),stderr=subprocess.STDOUT);time.sleep(2)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for width in (1440,390,320):
            ctx=browser.new_context(viewport={'width':width,'height':1000},timezone_id='Australia/Sydney');page=ctx.new_page();errors=[];responses=[];console=[];failed=[];proxied=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:console.append({'type':m.type,'text':m.text}) if m.type=='error' else None)
            page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
            page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/sports-data/' in r.url else None)
            if server:
                # Local preview is not an authorized production browser origin.
                # Public GET body/status stay exact; only this test response's CORS
                # headers permit localhost. Production CORS/config is untouched.
                def proxy(route):
                    if route.request.method!='GET':return route.abort()
                    response=route.fetch()
                    headers=dict(response.headers)
                    headers['access-control-allow-origin']=site
                    headers['access-control-allow-credentials']='true'
                    body=response.body()
                    proxied.append({'url':route.request.url,'status':response.status,'body_sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body)})
                    if '/sports-data/players/' in route.request.url:
                        (out/f'player-response-{width}.json').write_bytes(body)
                    route.fulfill(response=response,headers=headers)
                page.route('https://allball-backend-production.up.railway.app/**',proxy)
            try:
                page.goto(site+'/players/825815?name=Aidan%20Keena&event_id=ninko-evt-8ea488bb6f0bcf5038b7',wait_until='domcontentloaded')
                page.locator('.player-summary .player-value-card').wait_for(timeout=45000)
                metrics=page.evaluate('''() => {const b=document.querySelector('.entity-page').getBoundingClientRect(),v=document.querySelector('.player-value-card').getBoundingClientRect();return {width:b.width,left:b.left,right:innerWidth-b.right,valueBottom:v.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1,career:document.querySelectorAll('.player-career li').length,stats:document.querySelectorAll('.player-season-grid dd').length,cardBorder:getComputedStyle(document.querySelector('.entity-card')).borderTopWidth};}''')
                passed=not metrics['overflow'] and metrics['valueBottom']<700 and metrics['career']==13 and metrics['stats']==8 and metrics['cardBorder']=='1px' and not errors
                if width==1440:passed=passed and metrics['width']==1100 and abs(metrics['left']-metrics['right'])<2
                page.screenshot(path=str(out/f'player-{width}.png'));page.screenshot(path=str(out/f'player-full-{width}.png'),full_page=True)
                report.append({'page':'player','width':width,'pass':passed,**metrics,'network':responses.copy(),'errors':errors.copy()})
                page.locator('.player-club-link').click()
                page.wait_for_function("!document.querySelector('.player-summary') && document.querySelector('.entity-hero h1')?.textContent.includes('Patrick')",timeout=45000)
                team=page.locator('.entity-hero h1').inner_text();overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
                report.append({'page':'team-link','width':width,'pass':"Patrick" in team and not overflow and not errors,'team':team,'url':str(page.url),'errors':errors.copy()})
                page.screenshot(path=str(out/f'team-{width}.png'))
            except Exception as e:
                report.append({'page':'failure','width':width,'pass':False,'error':str(e),'errors':errors.copy(),'console':console.copy(),'network':responses.copy(),'failed_requests':failed.copy(),'proxied':proxied.copy()})
                page.screenshot(path=str(out/f'failure-{width}.png'),full_page=True)
                (out/f'failure-{width}.html').write_text(page.content())
            finally:
                (out/f'network-{width}.json').write_text(json.dumps({'responses':responses,'console':console,'failed':failed,'proxied':proxied},indent=2));ctx.close()
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
    (out/'profile-browser.json').write_text(json.dumps({'mode':'candidate built UI and actual public API bytes, test-local CORS headers only' if server else 'actual deployed site without interception','checks':report},indent=2))
print(json.dumps(report,indent=2));assert len(report)==6 and all(r['pass'] for r in report)
