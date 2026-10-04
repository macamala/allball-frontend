from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlsplit
from datetime import datetime, timezone
import json
from playwright.sync_api import sync_playwright, expect

ROOT=Path('player-public-proof');ROOT.mkdir(exist_ok=True)
SITE='https://ninkosports.com';API='https://allball-backend-production.up.railway.app'
CASES=[('rade-kruni-returns-to-training-for-crvena-zvezda','438456'),('samuel-lino-offers-to-fill-flamengos-midfield-role-during-arrascaetas-absence','438647')]
def get(url):
    with urlopen(Request(url,headers={'Accept':'application/json','User-Agent':'NinkoSports-News-PlayerAcceptance/1.0'}),timeout=75) as r:
        return json.loads(r.read(4000000))
refs={};articles={}
for slug,pid in CASES:
    articles[slug]=get(API+'/articles/'+slug)
    context=get(SITE+'/news-data/football/articles/'+slug+'/context')
    player=next(p for p in context['players'] if p['id']==pid)
    assert player['profile']['id']==pid and player['profile']['photo']
    assert player['href']=='/football/players/'+pid+'?article='+slug
    refs[slug]=player
(ROOT/'references.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2))
checks=[];failures=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in [1440,390,320]:
        context=browser.new_context(viewport={'width':width,'height':1000},timezone_id='Australia/Sydney')
        page=context.new_page();errors=[];writes=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda r:writes.append(r.url) if '/sports-data/' in r.url and r.method not in ['GET','HEAD','OPTIONS'] else None)
        def layout():
            d=page.evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})');assert d['page']<=width+3,d
        def snapshot(label):page.screenshot(path=str(ROOT/f'{width}-{label}.png'),full_page=True)
        for slug,pid in CASES:
            row={'width':width,'slug':slug,'player_id':pid}
            try:
                ref=refs[slug];facts=ref['profile'];article=articles[slug]
                page.goto(SITE+'/article/'+slug,wait_until='domcontentloaded',timeout=45000)
                expect(page.locator('.article-page h1')).to_have_text(article['title'],timeout=30000)
                link=page.get_by_role('link',name='View player: '+ref['name'],exact=True)
                expect(link).to_be_visible(timeout=75000)
                expect(link).to_have_attribute('href',ref['href'])
                inline=page.locator('.article-body a[href="'+ref['href']+'"]');assert inline.count()>0
                content=' '.join(article['content'].split())
                assert any(content in ' '.join(body.split()) for body in page.locator('.article-body').all_inner_texts())
                expect(page.get_by_role('button',name='Refresh news',exact=True)).to_have_count(0)
                assert not page.locator('img[src*="soccernews.com/og/og-image"]').count()
                layout();snapshot(pid+'-article')
                link.click();expect(page.locator('.news-player-profile h1')).to_have_text(ref['name'],timeout=75000)
                expect(page.locator('.news-player-profile [role=alert]')).to_have_count(0)
                img=page.locator('.news-player-profile img').first
                img.scroll_into_view_if_needed();img.evaluate('i=>i.decode()')
                image=img.evaluate('i=>({src:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})')
                assert image['src']==facts['photo'] and image['width']>=48 and image['height']>=48,image
                for field in facts['fields']:
                    expect(page.locator('.news-player-profile .entity-facts')).to_contain_text(str(field['value']))
                expect(page.get_by_role('heading',name=facts['competition']['name']+' · '+facts['competition']['season'],exact=True)).to_be_visible()
                actual=page.locator('.player-season-grid > div').evaluate_all('(rows)=>rows.map(r=>({label:r.querySelector("dt").textContent,value:r.querySelector("dd").textContent}))')
                expected=[{'label':s['label'],'value':f"{s['value']:.2f}" if isinstance(s['value'],float) and not s['value'].is_integer() else str(s['value'])} for s in facts['competition']['stats']]
                assert actual==expected,(actual,expected)
                expect(page.locator('.player-career > li')).to_have_count(len(facts['career']))
                layout();snapshot(pid+'-profile')
                current=page.get_by_role('link',name=facts['team']['name'],exact=True)
                path=current.get_attribute('href');parsed=urlsplit(path);target=get(API+'/sports-data'+parsed.path+'?'+parsed.query)
                assert target['available'] and str(target['team']['id'])==facts['team']['id']
                current.click();expect(page.locator('.entity-page h1')).to_have_text(target['name'],timeout=45000)
                layout();page.go_back(wait_until='domcontentloaded');expect(page.locator('.news-player-profile h1')).to_have_text(ref['name'],timeout=75000)
                page.get_by_role('link',name='← Back to article',exact=True).click()
                expect(page.locator('.article-page h1')).to_have_text(article['title'],timeout=30000)
                row.update(passed=True,photo=image,profile_fields=len(facts['fields']),stat_rows=len(actual),career_rows=len(facts['career']),inline_links=inline.count(),current_team_id=facts['team']['id'])
            except Exception as e:
                row['error']=type(e).__name__+': '+str(e)[:1200];failures.append(row.copy())
                try:snapshot(pid+'-error')
                except Exception:pass
            checks.append(row)
        row={'width':width,'test':'existing_article_and_profile_links_unchanged'}
        try:
            slug='bruno-fernandes-urges-portugal-unity-amid-ronaldo-and-jesus-disagreement'
            page.goto(SITE+'/article/'+slug,wait_until='domcontentloaded',timeout=45000)
            link=page.get_by_role('link',name='View player: Bruno Fernandes',exact=True);expect(link).to_be_visible(timeout=75000)
            href=link.get_attribute('href');assert href.startswith('/players/422685?') and 'event_id=' in href
            link.click();expect(page.locator('.entity-page h1')).to_have_text('Bruno Fernandes',timeout=45000)
            assert 'Player data is not available yet' not in page.locator('.entity-page').inner_text()
            layout();row['passed']=True
        except Exception as e:row['error']=str(e)[:900];failures.append(row.copy())
        checks.append(row)
        for path in ['/','/football']:
            row={'width':width,'path':path,'test':'appearance_unchanged'}
            try:
                page.goto(SITE+path,wait_until='domcontentloaded',timeout=45000)
                image=page.locator('.hero-lead img').first;image.wait_for(timeout=30000);image.scroll_into_view_if_needed();image.evaluate('i=>i.decode()')
                assert image.evaluate('i=>i.naturalWidth')>=200
                expect(page.get_by_role('button',name='Refresh news',exact=True)).to_have_count(0)
                assert not page.locator('img[src*="soccernews.com/og/og-image"]').count()
                layout();snapshot('home' if path=='/' else 'football');row['passed']=True
            except Exception as e:row['error']=str(e)[:800];failures.append(row.copy())
            checks.append(row)
        if errors:failures.append({'width':width,'page_errors':errors})
        if writes:failures.append({'width':width,'sports_write_requests':writes})
        context.close()
    browser.close()
summary={'checked_at':datetime.now(timezone.utc).isoformat(),'production_origin':True,'mocked_data':False,'injected_css':False,'checks':len(checks),'passed':sum(r.get('passed',False) for r in checks),'failures':failures,'all_news_complete':False}
(ROOT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));(ROOT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False,indent=2));assert not failures,failures
