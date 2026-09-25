"""Read-only browser acceptance against the built frontend and public API."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(os.environ.get('MOBILE_QA_OUT', '/tmp/mobile-evidence'))
OUT.mkdir(parents=True, exist_ok=True)
SITE = os.environ.get('MOBILE_QA_SITE', 'http://127.0.0.1:5173').rstrip('/')
EVENT = 'ninko-evt-010ca31ce1e357f39eb6'
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (320, 390, 1440):
        context = browser.new_context(viewport={'width':width,'height':1000}, timezone_id='Australia/Sydney')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        result = {'width':width,'checked_at':datetime.now(timezone.utc).isoformat(),'site':SITE}
        try:
            page.goto(f'{SITE}/scores/event/{EVENT}#mc-standings', wait_until='domcontentloaded', timeout=60000)
            panel = page.locator('.standings-responsive').first
            panel.wait_for(state='visible', timeout=45000)
            page.wait_for_timeout(500)
            region = panel.locator('.standings-viewport')
            select = panel.locator('select')
            original_group = select.input_value()
            assert 'Grp. 2' in select.locator('option:checked').inner_text()
            assert 'Serbia' in panel.locator('tbody').inner_text()
            result['initial_teams'] = panel.locator('tbody .standings-team').all_text_contents()
            active = page.get_by_role('tab', name='Standings', exact=True)
            assert active.get_attribute('aria-selected') == 'true'
            rail = page.locator('.mc-tabs').bounding_box()
            tab = active.bounding_box()
            assert tab['x'] >= rail['x'] - 2 and tab['x'] + tab['width'] <= rail['x'] + rail['width'] + 2
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            result['compact_visible_columns'] = panel.locator('th').evaluate_all('(nodes) => nodes.filter(n=>getComputedStyle(n).display!=="none").map(n=>n.dataset.column)')
            if width <= 720:
                assert result['compact_visible_columns'] == ['position','team','played','goal_difference','points']
                assert region.evaluate('(n)=>n.scrollWidth <= n.clientWidth+2'), 'Compact table overflows'
                assert panel.locator('th[data-column="points"]').is_visible()
                page.screenshot(path=str(OUT/f'{width}-compact.png'), full_page=True)
                panel.get_by_role('button', name='Full table', exact=True).click()
                assert panel.get_by_role('button', name='Compact table', exact=True).get_attribute('aria-expanded') == 'true'
                for column in ('wins','draws','losses','goals_for','goals_against'):
                    assert panel.locator(f'th[data-column="{column}"]').is_visible()
                region.evaluate('(n)=>n.scrollLeft=n.scrollWidth')
                team_box = panel.locator('th[data-column="team"]').bounding_box()
                bounds = region.bounding_box()
                assert team_box['x'] >= bounds['x'] - 1 and team_box['x'] < bounds['x']+40
                page.screenshot(path=str(OUT/f'{width}-full-scrolled.png'), full_page=True)
                panel.get_by_role('button', name='Compact table', exact=True).click()
                assert region.evaluate('(n)=>n.scrollLeft') == 0
            else:
                assert 'wins' in result['compact_visible_columns'] and 'goals_against' in result['compact_visible_columns']
                assert not panel.get_by_role('button', name='Full table', exact=True).is_visible()
                page.screenshot(path=str(OUT/f'{width}-full.png'), full_page=True)
            option = select.locator('option').filter(has_text='UEFA Nations League B Grp. 3').first
            select.select_option(option.get_attribute('value'))
            assert 'Austria' in panel.locator('tbody').inner_text()
            assert 'Serbia' not in panel.locator('tbody').inner_text()
            select.select_option(original_group)
            assert 'Serbia' in panel.locator('tbody').inner_text()
            assert not errors, errors
            result.update({'pass':True,'errors':errors,'group_switch_pass':True,'active_tab_visible':True,'page_overflow':False})
        except Exception as error:
            result.update({'pass':False,'error':str(error),'errors':errors})
            page.screenshot(path=str(OUT/f'{width}-failed.png'), full_page=True)
        finally:
            results.append(result)
            context.close()
    browser.close()
(OUT/'browser.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
assert all(row['pass'] for row in results), 'Mobile/desktop acceptance failed; do not publish.'
