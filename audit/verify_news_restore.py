"""Actual public-site acceptance. No intercepted responses or injected styles."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import urlopen, Request
import json, time
from playwright.sync_api import sync_playwright, expect

SITE='https://ninkosports.com'
API='https://allball-backend-production.up.railway.app'
ROOT=Path('news-visible-proof'); ROOT.mkdir(exist_ok=True)
SLUG='bruno-fernandes-urges-portugal-unity-amid-ronaldo-and-jesus-disagreement'
CANADA='canada-coach-jesse-marsch-cites-2-0-win-over-peru-ahead-of-usa-football-friendly'

def public(path):
    for attempt in range(2):
        try:
            with urlopen(Request(API+path,headers={'User-Agent':'NinkoSports-News-UIAcceptance/1.0'}),timeout=25) as r:
                return json.loads(r.read(4_000_000))
        except Exception:
            if attempt: raise
            time.sleep(.5)

references={slug:public('/articles/'+slug) for slug in [SLUG,CANADA]}
for slug,a in references.items():
    assert a['slug']==slug and a['sport']=='football' and a['image_url']
    assert '/og/og-image.' not in a['image_url']
(ROOT/'article-reference.json').write_text(json.dumps({slug:{k:a.get(k) for k in ['id','title','slug','image_url','published_at']} for slug,a in references.items()},indent=2))
checks=[];failures=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in [1440,390,320]:
        context=browser.new_context(viewport={'width':width,'height':950},timezone_id='Australia/Sydney')
        page=context.new_page();errors=[];writes=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda req:writes.append({'method':req.method,'url':req.url}) if '/sports-data/' in req.url and req.method not in ['GET','HEAD','OPTIONS'] else None)
        def layout():
            dims=page.evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})')
            assert dims['page']<=width+3,dims
            return dims
        def no_branding():
            bad=page.locator('img').evaluate_all('(imgs)=>imgs.filter(i=>/soccernews\\.com\\/og\\/og-image\\./i.test(i.currentSrc||i.src)).map(i=>i.src)')
            assert not bad,bad
            expect(page.get_by_role('button',name='Refresh news',exact=True)).to_have_count(0)
        def shot(name,locator=None):
            if locator is not None:locator.scroll_into_view_if_needed()
            page.screenshot(path=str(ROOT/f'{width}-{name}.png'))
        for path in ['/','/football','/football/other-leagues']:
            row={'width':width,'path':path}
            try:
                page.goto(SITE+path,wait_until='domcontentloaded',timeout=45000)
                if path.endswith('other-leagues'):
                    expect(page.locator('.news-league-countries')).to_be_visible(timeout=25000)
                    assert page.locator('.news-league-countries li a').count()>=80
                    expect(page.locator('.news-league-latest,.news-league-preview,.news-league-story-preview')).to_have_count(0)
                    row['directory_links']=page.locator('.news-league-countries li a').count()
                else:
                    image=page.locator('.hero-lead img').first
                    image.wait_for(timeout=30000);image.scroll_into_view_if_needed()
                    page.wait_for_function('(i)=>i.complete&&i.naturalWidth>=200',arg=image.element_handle(),timeout=20000)
                    row['lead_photo']=image.evaluate('(i)=>({url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})')
                no_branding();row['layout']=layout();shot(path.strip('/').replace('/','-') or 'home')
                row['passed']=True
            except Exception as e:
                row['error']=type(e).__name__+': '+str(e)[:900];failures.append(row.copy())
                try:shot('appearance-error')
                except Exception:pass
            checks.append(row)
        row={'width':width,'path':'/article/'+SLUG,'clicks':[]}
        try:
            page.goto(SITE+'/article/'+SLUG,wait_until='domcontentloaded',timeout=45000)
            expect(page.locator('.article-page h1')).to_have_text(references[SLUG]['title'],timeout=25000)
            hero=page.locator('.article-page img').first;hero.wait_for();hero.scroll_into_view_if_needed()
            page.wait_for_function('(i)=>i.complete&&i.naturalWidth>=200',arg=hero.element_handle(),timeout=20000)
            row['photo']=hero.evaluate('(i)=>({url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})')
            assert references[SLUG]['image_url'] in row['photo']['url']
            expect(page.get_by_role('link',name='View player: Bruno Fernandes',exact=True)).to_be_visible(timeout=65000)
            expect(page.get_by_role('link',name='View player: Cristiano Ronaldo',exact=True)).to_be_visible(timeout=20000)
            expect(page.get_by_role('link',name='View team: Portugal',exact=True)).to_be_visible()
            title_text=page.locator('.article-page h1').inner_text()
            assert title_text==references[SLUG]['title']
            inline=page.locator('.article-page .article-body .news-entity-link')
            assert inline.count()>=3
            row['inline_links']=inline.evaluate_all('(links)=>links.map(a=>({text:a.textContent,path:a.getAttribute("href")}))')
            no_branding();layout();shot('article-linked',page.locator('.article-header'))
            shot('article-entities',page.locator('.news-article-links'))
            for kind,name in [('player','Bruno Fernandes'),('player','Cristiano Ronaldo'),('team','Portugal')]:
                link=page.get_by_role('link',name=f'View {kind}: {name}',exact=True)
                href=link.get_attribute('href');assert href.startswith('/'+('players/' if kind=='player' else 'teams/'))
                link.click();page.wait_for_url('**'+href,timeout=20000)
                expect(page.locator('.entity-page h1')).to_have_text(name,timeout=45000)
                text=page.locator('.entity-page').inner_text()
                assert 'data is not available yet' not in text
                if kind=='player':
                    assert page.locator('.entity-facts div').count()>=3
                    assert 'Player details' in text
                    row['clicks'].append({'kind':kind,'name':name,'href':href,'details':page.locator('.entity-facts').all_inner_texts(),'matches':page.locator('.entity-match-row').count()})
                else:
                    assert page.locator('.entity-match-row').count()>0
                    row['clicks'].append({'kind':kind,'name':name,'href':href,'matches':page.locator('.entity-match-row').count()})
                layout();shot(kind+'-'+name.replace(' ','-'),page.locator('.entity-hero'))
                page.go_back(wait_until='domcontentloaded')
                expect(page.get_by_role('link',name='View player: Bruno Fernandes',exact=True)).to_be_visible(timeout=65000)
            from urllib.parse import urlsplit,parse_qs
            player_link=page.get_by_role('link',name='View player: Bruno Fernandes',exact=True).get_attribute('href')
            event=parse_qs(urlsplit(player_link).query)['event_id'][0]
            match=page.locator(f'.news-related-matches a[href="/scores/event/{event}"]')
            expect(match).to_have_count(1)
            match.click();expect(page.locator('.page-match h1')).to_have_count(1,timeout=45000)
            expect(page.get_by_role('tab',name='Lineups',exact=True)).to_be_visible(timeout=30000)
            page.get_by_role('tab',name='Lineups',exact=True).click()
            expect(page.locator('.page-match')).to_contain_text('Bruno Fernandes',timeout=25000)
            row['clicks'].append({'kind':'match','id':event,'title':page.locator('.page-match h1').inner_text(),'lineup_player_found':True})
            layout();shot('match-from-news')
            row['passed']=True
        except Exception as e:
            row['error']=type(e).__name__+': '+str(e)[:1200];failures.append(row.copy())
            try:shot('article-entity-error')
            except Exception:pass
        checks.append(row)
        row={'width':width,'path':'/football/premier-league','clicks':[]}
        try:
            page.goto(SITE+'/football/premier-league',wait_until='domcontentloaded',timeout=45000)
            page.get_by_role('tab',name='Fixtures',exact=True).click()
            page.wait_for_function("document.querySelector('.news-football-data')?.getAttribute('aria-busy')==='false'",timeout=45000)
            panel=page.locator('.news-football-data');expect(panel.locator('[role=alert]')).to_have_count(0)
            team=page.locator('.news-data-team a').first
            expect(team).to_be_visible();name=team.inner_text();href=team.get_attribute('href')
            team.click();expect(page.locator('.entity-page h1')).to_have_text(name,timeout=45000)
            assert 'Team data is not available yet.' not in page.locator('.entity-page').inner_text()
            row['clicks'].append({'origin':'News fixtures','name':name,'href':href})
            page.go_back(wait_until='domcontentloaded');page.get_by_role('tab',name='Standings',exact=True).click()
            page.wait_for_function("document.querySelector('.news-football-data')?.getAttribute('aria-busy')==='false'",timeout=45000)
            expect(page.locator('.news-football-data tbody tr')).to_have_count(20)
            team=page.locator('.news-football-data .standings-team').first
            expect(team).to_have_attribute('href',__import__('re').compile(r'^/teams/'))
            name=team.inner_text().strip();href=team.get_attribute('href');team.click()
            expect(page.locator('.entity-page h1')).to_have_text(name,timeout=45000)
            assert 'Team data is not available yet.' not in page.locator('.entity-page').inner_text()
            row['clicks'].append({'origin':'News standings','name':name,'href':href})
            layout();row['passed']=True
        except Exception as e:
            row['error']=type(e).__name__+': '+str(e)[:900];failures.append(row.copy())
            try:shot('data-click-error')
            except Exception:pass
        checks.append(row)
        if errors: failures.append({'width':width,'page_errors':errors})
        if writes: failures.append({'width':width,'sport_write_requests':writes})
        (ROOT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
        context.close()
    browser.close()
summary={'checked_at':datetime.now(timezone.utc).isoformat(),'actual_production_origin':True,'mocked_responses':False,'injected_styles':False,'widths':[1440,390,320],'checks':len(checks),'passed':sum(r.get('passed',False) for r in checks),'profile_and_match_clicks':sum(len(r.get('clicks',[])) for r in checks),'failures':failures}
(ROOT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False,indent=2));assert not failures,failures
