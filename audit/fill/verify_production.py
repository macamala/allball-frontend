"""Actual public-site checks. No request mocks, CSS injection, or production writes."""
import collections,json,pathlib
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path('production-proof');ROOT.mkdir(exist_ok=True)
refs=json.loads((ROOT/'references.json').read_text());cases=refs['cases'];checks=[];failures=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in [1440,390,320]:
        context=browser.new_context(viewport={'width':width,'height':960},timezone_id='Australia/Sydney')
        page=context.new_page();errors=[];writes=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:writes.append(r.url) if ('/sports-data/' in r.url or '/news-data/' in r.url) and r.method not in {'GET','HEAD','OPTIONS'} else None)
        def ready():
            page.locator('.news-football-data').wait_for(timeout=25000)
            page.wait_for_function("document.querySelector('.news-football-data')?.getAttribute('aria-busy')==='false'",timeout=60000)
            expect(page.get_by_role('button',name='Refresh data',exact=True)).to_be_enabled(timeout=60000)
        def dims():
            d=page.evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})');assert d['page']<=width+3,d;return d
        def table_values():
            return page.locator('.news-football-data tbody tr').evaluate_all("rows=>rows.map(r=>({team:r.querySelector('[data-column=team]').innerText.trim(),points:r.querySelector('[data-column=points]').innerText.trim()}))")
        def ids():return page.locator('.news-data-list:visible > .news-data-match:visible').evaluate_all('(rows)=>rows.map(r=>r.dataset.matchKey)')
        for case in cases:
            key=case['league'];ref=case['table'];result={'league':key,'width':width,'groups':[],'views':{}}
            try:
                page.goto('https://ninkosports.com/football/'+case['path'],wait_until='domcontentloaded',timeout=45000)
                page.get_by_role('tab',name='Standings',exact=True).click();ready();panel=page.locator('.news-football-data')
                assert panel.locator('[role=alert]').count()==0,panel.inner_text()
                expected=collections.defaultdict(list)
                for row in ref['rows']:expected[(str(row.get('stage') or ''),str(row.get('group') or ''))].append(row)
                options=page.get_by_role('combobox',name='Standings group',exact=True)
                if len(expected)>1:
                    options.wait_for();values=options.locator('option').evaluate_all('(opts)=>opts.filter(o=>o.value).map(o=>o.value)')
                    assert len(values)==len(expected),(values,list(expected))
                    for value in values:
                        stage,group=json.loads(value);original=expected[(stage,group)]
                        options.select_option(value)
                        match={r['team']:str(r['points']) for r in original}
                        page.wait_for_function("wanted=>JSON.stringify(Object.fromEntries([...document.querySelectorAll('.news-football-data tbody tr')].map(r=>[r.querySelector('[data-column=team]').innerText.trim(),r.querySelector('[data-column=points]').innerText.trim()]).sort()))===JSON.stringify(Object.fromEntries(Object.entries(wanted).sort()))",arg=match,timeout=12000)
                        result['groups'].append({'stage':stage,'group':group,'rows':len(original),'points_match_source':True});dims()
                else:
                    match={r['team']:str(r['points']) for r in ref['rows']}
                    expect(page.locator('.news-football-data tbody tr')).to_have_count(len(match))
                    assert {r['team']:r['points'] for r in table_values()}==match
                    result['groups'].append({'rows':len(match),'points_match_source':True})
                if ref.get('_newsRead',{}).get('supplementary'):
                    assert panel.locator('tbody a[href*="/teams/"]').count()==0
                    result['no_false_internal_team_links']=True
                if ref.get('_newsRead',{}).get('edition'):
                    expect(panel.get_by_text('Tournament edition: '+ref['season']+'.',exact=False)).to_be_visible()
                    result['edition']=ref['season']
                    if ref['_newsRead'].get('currentEditionUnavailable'):assert 'current edition is unavailable' in panel.inner_text()
                if key=='serbia-prva-liga':assert 'Provisional official standings' in panel.inner_text()
                first=panel.locator('tbody tr').first;first.scroll_into_view_if_needed()
                picture=first.locator('img');expect(picture).to_have_count(1)
                page.wait_for_function('img=>img.complete&&img.naturalWidth>0',arg=picture.element_handle(),timeout=20000)
                result['first_table_crest_decoded']=True;result['views']['Standings']={'rows':len(ref['rows']),'layout':dims()}
                if key in {'england-championship','serbia-prva-liga','spain-la-liga-2','fifa-world-cup','caf-champions-league'}:
                    page.locator('.news-data-heading').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/f'{width}-{key}-standings.png'))
                if case.get('hub'):
                    hub=case['hub']
                    for tab in ['Fixtures','Results']:
                        page.get_by_role('tab',name=tab,exact=True).click();ready();assert panel.locator('[role=alert]').count()==0,panel.inner_text()
                        target=hub[tab.lower()];result['views'][tab]={'total':len(target),'visible':len(ids()),'layout':dims()}
                        expected_visible=target[:40]
                        actual=ids();assert actual==[e['key'] for e in expected_visible],(tab,actual,[e['key'] for e in expected_visible])
                        visible=panel.locator('.news-data-list:visible > .news-data-match:visible')
                        if target:
                            first=visible.first;first.scroll_into_view_if_needed();imgs=first.locator('.news-data-team img');expect(imgs).to_have_count(2)
                            page.wait_for_function('el=>[...el.querySelectorAll(".news-data-team img")].every(i=>i.complete&&i.naturalWidth>0)',arg=first.element_handle(),timeout=20000)
                            if target[0].get('details_available') is False:assert first.locator('a').count()==0
                        if key in {'serbia-prva-liga','spain-la-liga-2'} and len(target)>40:
                            button=page.get_by_role('button',name='Show more matches',exact=True)
                            while button.count():button.click()
                            assert ids()==[e['key'] for e in target]
                            result['views'][tab]['all_rows_reachable']=True
                        if tab=='Fixtures':
                            for index,e in enumerate(target[:40]):
                                row=visible.nth(index)
                                if e['status']=='scheduled':assert row.locator('.news-data-team b').all_text_contents()==['—','—']
                                if e.get('start_precision')=='DATE_ONLY':assert 'Time TBC' in row.inner_text()
                    if key=='serbia-prva-liga':
                        # The source has valid full-season data; an empty selected day must stay empty.
                        page.get_by_role('tab',name='Fixtures',exact=True).click();ready()
                        day=hub['fixtures'][0].get('source_date')
                        assert day
                        page.get_by_label('News matches from',exact=True).fill(day);page.get_by_label('News matches to',exact=True).fill(day)
                        page.get_by_role('button',name='Apply dates',exact=True).click();ready()
                        assert page.get_by_role('alert').count()==0
                        assert ids() and len(ids())<=8
                        result['source_date_filter_kept']=True
                        page.get_by_role('tab',name='Results',exact=True).click();ready()
                        assert f'Selected: {day} to {day}' in panel.inner_text()
                        page.get_by_role('tab',name='Fixtures',exact=True).click();ready()
                        before=ids();context.set_offline(True);page.get_by_role('button',name='Refresh data',exact=True).click();ready()
                        assert ids()==before
                        context.set_offline(False);page.get_by_role('button',name='Refresh data',exact=True).click();ready()
                        assert ids()==before and page.get_by_role('alert').count()==0
                        result['offline_snapshot_retained_and_recovered']=True
                        page.locator('.news-data-heading').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/f'{width}-{key}-fixtures.png'))
                page.get_by_role('tab',name='News',exact=True).click();expect(panel).to_have_count(0)
                result['passed']=True
            except Exception as error:
                result['error']=type(error).__name__+': '+str(error)[:1200];failures.append({'league':key,'width':width,'error':result['error']});context.set_offline(False)
                try:page.screenshot(path=str(ROOT/f'{width}-{key}-error.png'))
                except Exception:pass
            checks.append(result);(ROOT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
        if errors:failures.append({'width':width,'page_errors':errors})
        if writes:failures.append({'width':width,'unexpected_write_requests':writes})
        context.close()
    browser.close()
summary={'checked_at':datetime.now(timezone.utc).isoformat(),'page_checks':len(checks),'tab_checks':sum(len(c['views']) for c in checks),'group_checks':sum(len(c['groups']) for c in checks),'failures':failures,'mocked_responses':False,'injected_css':False,'production_origin':True}
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2));assert not failures,failures
