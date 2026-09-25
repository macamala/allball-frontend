"""Read-only production browser, candidate CSS injected only into this test tab."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('evidence');OUT.mkdir(exist_ok=True)
URL='https://ninkosports.com/scores/event/ninko-evt-8ea488bb6f0bcf5038b7'
CSS='\n'.join(line[1:] for line in Path('audit/c13_match_layout.patch').read_text().splitlines() if line.startswith('+') and not line.startswith('+++'))
METRICS='''() => { const box=document.querySelector('.page-match').getBoundingClientRect();return {viewport:innerWidth,left:box.left,width:box.width,right:innerWidth-box.right,overflow:document.documentElement.scrollWidth>innerWidth+1,crests:[...document.querySelectorAll('.mc-player .score-crest')].map(x=>x.getBoundingClientRect().width),names:[...document.querySelectorAll('.mc-roster-player-button .mc-bench-name')].map(x=>({text:x.textContent,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height,ellipsis:getComputedStyle(x).textOverflow})),buttons:[...document.querySelectorAll('.mc-roster-player-button')].map(x=>({width:x.getBoundingClientRect().width,parent:x.parentElement.getBoundingClientRect().width}))};}'''
report=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in (1440,390,320):
        ctx=browser.new_context(viewport={'width':width,'height':1000},timezone_id='Australia/Sydney');page=ctx.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL+'#mc-lineups',wait_until='domcontentloaded',timeout=60000)
        page.locator('#mc-panel-lineups:not([hidden]) .mc-pitch-player').first.wait_for(timeout=45000)
        before=page.evaluate(METRICS)
        page.add_style_tag(content=CSS)
        page.wait_for_timeout(300)
        after=page.evaluate(METRICS)
        passed=not after['overflow'] and len(after['names'])>=22 and all(x['width']>=80 and x['height']>=12 and x['text'].strip() and x['ellipsis']=='clip' for x in after['names']) and all(x['width']>=x['parent']-3 for x in after['buttons']) and all(abs(x-(48 if width>640 else 40))<1 for x in after['crests']) and not errors
        if width==1440:passed=passed and after['width']>=1050 and abs(after['left']-after['right'])<=2
        page.screenshot(path=str(OUT/f'layout-lineups-{width}.png'),full_page=True)
        page.locator('.mc-starting-lists').scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'layout-roster-{width}.png'))
        page.locator('#mc-tab-overview').click();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'layout-overview-{width}.png'),full_page=True)
        report.append({'width':width,'before':before,'after':after,'pass':passed,'errors':errors})
        ctx.close()
    browser.close()
(OUT/'layout-browser.json').write_text(json.dumps({'mode':'candidate CSS injected into read-only browser; not deployed proof','checks':report},indent=2))
print(json.dumps([{'width':r['width'],'before_min_name_width':min(x['width'] for x in r['before']['names']),'after_min_name_width':min(x['width'] for x in r['after']['names']),'pass':r['pass']} for r in report]))
assert all(r['pass'] for r in report)
