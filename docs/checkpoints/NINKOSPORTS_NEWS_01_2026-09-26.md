# NinkoSports News checkpoint 01 — 26 September 2026

## Status: isolated candidate accepted; NOT merged or deployed

This is the first bounded News workstream checkpoint. It does not supersede the completed football checkpoint17 and is not completion of News, Football, Live Scores or public-launch acceptance.

User authorized this second chat to work on News in parallel. Coordination is backend issue8; primary recovery/release ownership stays with backend issue6 and the Live Scores chat. A posted coordination notice is not an automatic file lock and does not prove the other chat has read it.

Exact tested frontend candidate: `808f5133db9945c8036992f3b846bd97a62a6cf8`, branch `news/isolated-20260926-01`. This subsequent checkpoint commit changes documentation only. Fresh-read production refs during final review still matched frontend master `9a9d1cc996f746a63d4716043b849a7b12e57538` and backend main `cf192f22da637b9b54495cd5fc2ba238abbfbee3`. Backend's isolated branch was created at that backend base and has no edits from this workstream. Never reset a newer primary head to these recorded bases.

No production branch write, merge, PR, deploy, Railway Agent/action, service restart/settings change, DB mutation/migration, collector/scheduler run, paid AI/provider ingestion or score-cache clearing was performed. No deployment status was independently re-audited here; these are Git refs and workstream action boundaries, not new production acceptance.

## Exact changed-file ownership

Only two runtime files:
- `src/pages/ArticlePage.jsx` (existing article reader).
- `src/lib/newsArticleState.js` (new News-only boundary helper).

New tests: `src/pages/ArticlePage.news.test.jsx`, `src/lib/newsArticleState.test.js`.
New audit/gate files: `audit/news_public_readonly.py`, `audit/news_reader_browser.py`, `.github/workflows/news-isolated-gate.yml`.
This checkpoint is the only additional documentation file.

Shared homepage/navigation/layout/global styles, api.js, score routes/components, collectors, workers, schedulers and all backend runtime files remain unchanged. ArticlePage ownership is reserved for News review; coordinate overlapping edits explicitly before integration. The exact candidate diff against C17 had7files,9commits,0commits behind at that comparison. Do not treat that as a future no-conflict guarantee.

## Reader changes and scope

Failed detail loading after a feed preview now terminates the loading skeleton and shows an error plus Retry. Direct-load failures are retryable;404 removes even a cached shell rather than presenting a removed article. Empty successful payloads are not presented as completed articles or endless loading.

A15-second bound stops a stalled reader state. Explicit retry performs a fresh request for only that article through existing getJSON, avoiding rejoining its stale cache/inflight request without clearing shared caches. Normal navigation retains prefetch/cache behavior. Fresh retry requests are aborted on route change.

Exact requested slug and nonempty title are checked for previews, cached objects and detail responses. Render-time slug scoping supplements the pre-existing late-response guards. Article-local component state is keyed to slug. Valid readable content can remain visible alongside a refresh-error notice. Related-only/hero-only blocks do not masquerade as an article body; malformed optional blocks/list items are filtered and real content remains a fallback. No body is invented from summary/headline; original dates, facts and images are not rewritten. View recording requires a valid readable response and is once per route visit in the tested lifecycle.

This is reader reliability, not a News visual redesign, full content-quality audit, translation project, image licensing verification or freshness repair.

## Actual completed gates

Final workflow `36221050827`, exact candidate above: both jobs completed SUCCESS. Candidate job `108346253877` completed2026-09-26T05:32:44Z; public-readonly job `108346253935` also SUCCESS.

- Same new19reader cases replayed against unchanged C17 ArticlePage:19tests,13expected assertion failures,0errors. This is the baseline defect witness, not a passing baseline.
- Exact candidate full frontend suite:324tests across36files,0failures,0errors,0skips. Includes original296tests plus19reader and9helper tests. This is not a backend test run.
- Vite build passed, configured with a local test API for isolation; it is not a production release build delivered to Railway.
- Real Chromium at1440,390,320pixels passed preview->controlled503->Retry->full body, next-article identity and empty-response notice. No JS errors or page horizontal overflow in those journeys. All three actual screenshots and downloaded report were inspected.
- Browser uses synthetic LOCAL API fixtures and blocks unexpected external traffic. It does not prove live provider correctness or actual-production browser acceptance. Local mocked view POSTs are not production writes. No sports-data requests occurred in the News browser journeys.

Artifacts actually downloaded, ZIP integrity and SHA256 independently checked, actual JUnit/browser JSON parsed:

| Artifact | ID | ZIP SHA256 |
| --- | --- | --- |
| news-isolated-reader-candidate |10899172190|47c40410a4c505f29f3ca585d01385811b27579996e3617af3d6a1b3434ab339|
| news-isolated-public-readonly |10898429363|59aa83063d0c3df2d7a3e2dfcc85ffdee5b514e10f776db751ed61e8e6765b63|

Runtime SHA256: ArticlePage `b848fbd98cd02f259325c9b038cb5ddef7401c3495970f9de214ed329d0ca954`; newsArticleState `2b0d1120e6e98f17304f6050d6afd7e16ff529e40e1c8d8c4bdf57f37ff86760`. Full test/harness hashes are in artifact source-SHA256SUMS. Artifact retention is30days, not permanent backup; committed code/tests/audits and this evidence summary remain reproducible records.

### Failed attempts retained honestly

Run36220623454 failed in baseline replay because the mocked translator changed identity each render and induced an artificial effect loop. That run is not baseline proof. Test-only fix a8a0a143589bbb4790e2c90c10eadbe3aea767f6 makes the mock stable like the actual provider.

Run36220834260 then proved the19/13 baseline and passed324tests/build, but browser setup failed before browser execution: nonexistent Python Playwright1.51.1. Workflow-only correction808f513 to published1.51.0 produced the final successful run. Neither failed run is full acceptance. Second-run artifact10898708627 was independently verified at SHA2561601a4c65cd1b5c63023a3ad9d3d816614f933f07518c33a170e7ed88939d9af.

## Actual public News freshness gap — unresolved

Final public read-only audit observed2026-09-26T05:31:32.993409+00:00. All9bounded GETs returned200. `/articles?limit=20` contained20unique slugs and `/articles/recent?limit=12`12unique; neither sample had a publication date after2026-09-19. `/portal/home` returned55placements/45unique stories, including tennis fromMay2026, motorsport fromMay/June and LaLiga fromMay. This is stale public selection evidence, not proof of the ingestion failure's cause.

All sampled list entries had image URLs; that does not prove image loading, appropriateness or reuse rights. Repeated homepage placements do not establish duplicated database articles. Three actual detail samples21850/21844/21838 matched listID/slug/title, had321/598/248content words and14/24/9blocks; each had6related rows without another known sport, no inspected `[+N chars]` marker. These narrow samples are not global factuality or complete-article proof.

Source dates are date-only or timezone-naive; the audit intentionally did not invent hourly ages/timezones. Do not solve freshness by changing original publication dates.

Read-only backend source: Procfile separates News `python -m bot.scheduler` from scores `python -m collector.worker`. News scheduler runs ingestion immediately on startup and uses AI by default. This is why it must not be blindly started/restarted as a diagnostic. Runtime News service/environment/logs were not inspected. Homepage composition permits old candidates, but source alone does not prove the actual route query's full cause. No backend change in this checkpoint.

Existing npm lock installation reported7dependency advisories (5moderate/1high/1critical). They were not triaged for production exploitability; dependencies were not changed. Track separately and do not run unreviewed force upgrades alongside score work.

## Next step and primary-chat integration gate

Continue with read-only diagnosis of News freshness: deployed News process ownership/status/logs and configuration, provider fetch/extraction/rewrite failure stages, stored source dates and home-selection age policy, with costs controlled. Coordinate any scheduler, shared-home or backend bootstrap work through issue6 first. Keep actual publication dates and provenance; no fabricated fresh articles or empty sections disguised as fixes.

For this reader candidate, the primary Live Scores chat must fresh-read issue8, latest football checkpoint and both current production heads; review the exact isolated diff, integrate without restoring old full files over newer changes, rerun retained score and News tests/build and actual-production mobile/desktop checks before signoff. This News chat has not merged or deployed. Keep issues6 and8 open; whole News freshness and overall core completion remain unfinished.
