from pathlib import Path
p=Path('audit/verify_news_restore.py');s=p.read_text()
s=s.replace('import json, time','import json, time, re, unicodedata\nfrom urllib.parse import urlsplit, parse_qs')
old="references={slug:public('/articles/'+slug) for slug in [SLUG,CANADA]}"
new="""def canonical_team_name(value):
    text=unicodedata.normalize('NFKD',str(value or '')).casefold()
    text=''.join(c for c in text if not unicodedata.combining(c))
    text=re.sub(r'[^\\w]+',' ',text).strip()
    return re.sub(r'\\s+(?:fc|afc|fk|cf)$','',re.sub(r'^(?:fc|afc|fk|cf)\\s+','',text)).strip()

def team_reference(href, displayed_name):
    parts=urlsplit(href);assert parts.path.startswith('/teams/')
    payload=public('/sports-data'+parts.path+'?'+parts.query)
    entity=parts.path.rsplit('/',1)[1]
    assert payload.get('available') and str(payload.get('entity_key'))==entity
    assert str(payload.get('team',{}).get('id'))==entity
    actual=payload.get('name') or payload['team']['name']
    assert canonical_team_name(actual)==canonical_team_name(displayed_name),(actual,displayed_name)
    return actual

references={slug:public('/articles/'+slug) for slug in [SLUG,CANADA]}"""
assert old in s;s=s.replace(old,new)
s=s.replace("row['lead_photo']=image.evaluate", "image.evaluate('i=>i.decode()')\n                    row['lead_photo']=image.evaluate")
s=s.replace("row['photo']=hero.evaluate", "hero.evaluate('i=>i.decode()')\n            row['photo']=hero.evaluate")
s=s.replace("            team.click();expect(page.locator('.entity-page h1')).to_have_text(name,timeout=45000)", "            expected_name=team_reference(href,name)\n            team.click();expect(page.locator('.entity-page h1')).to_have_text(expected_name,timeout=45000)")
s=s.replace("name=team.inner_text().strip();href=team.get_attribute('href');team.click()\n            expect(page.locator('.entity-page h1')).to_have_text(name,timeout=45000)", "name=team.inner_text().strip();href=team.get_attribute('href');expected_name=team_reference(href,name);team.click()\n            expect(page.locator('.entity-page h1')).to_have_text(expected_name,timeout=45000)")
needle="        if errors: failures.append({'width':width,'page_errors':errors})"
extra="""        for slug,club_id in [
            ('rade-kruni-returns-to-training-for-crvena-zvezda','8687'),
            ('samuel-lino-offers-to-fill-flamengos-midfield-role-during-arrascaetas-absence','9770'),
            ('martin-terriers-limited-role-at-bayer-leverkusen-leaves-his-future-uncertain','8178'),
            ('axel-witsel-joins-nice-to-mentor-young-players-after-leaving-girona','9831'),
            ('roope-paunio-reported-to-join-tampereen-ilves-next-season','162162'),
        ]:
            row={'width':width,'path':'/article/'+slug,'clicks':[]}
            try:
                reference=public('/articles/'+slug)
                page.goto(SITE+'/article/'+slug,wait_until='domcontentloaded',timeout=45000)
                expect(page.locator('.article-page h1')).to_have_text(reference['title'],timeout=25000)
                link=page.locator(f'.news-article-links a[href^="/teams/{club_id}?"]')
                expect(link).to_be_visible(timeout=90000)
                expect(page.locator('.article-page a[href^="/teams/608816?"],.article-page a[href^="/teams/6110?"]')).to_have_count(0)
                expect(page.locator(f'.article-body a[href^="/teams/{club_id}?"]')).not_to_have_count(0)
                href=link.get_attribute('href');name=link.inner_text().strip();expected_name=team_reference(href,name)
                if slug.startswith('martin-terrier'):
                    expect(page.get_by_role('link',name='View team: France',exact=True)).to_have_count(0)
                photo=page.locator('.article-page img').first;photo.scroll_into_view_if_needed()
                photo.evaluate('i=>i.decode()');assert photo.evaluate('i=>i.naturalWidth')>=200
                no_branding();layout();shot('club-article-'+club_id,page.locator('.article-header'))
                shot('club-links-'+club_id,page.locator('.news-article-links'))
                link.click();expect(page.locator('.entity-page h1')).to_have_text(expected_name,timeout=45000)
                assert page.locator('.entity-match-row').count()>0
                assert 'data is not available yet' not in page.locator('.entity-page').inner_text()
                row['clicks'].append({'origin':'club article','id':club_id,'name':expected_name,'href':href,'displayed_matches':page.locator('.entity-match-row').count()})
                layout();shot('club-profile-'+club_id,page.locator('.entity-hero'));row['passed']=True
            except Exception as e:
                row['error']=type(e).__name__+': '+str(e)[:900];failures.append(row.copy())
                try:shot('club-click-error-'+club_id)
                except Exception:pass
            checks.append(row)
        if errors: failures.append({'width':width,'page_errors':errors})"""
assert needle in s;s=s.replace(needle,extra)
p.with_name('verify_news_restore_final.py').write_text(s)
compile(s,'verify_news_restore_final.py','exec')
print('Verified browser script prepared; all original checks retained.')
