# NinkoSports Football News data recovery — 3 October 2026

**Deployed and verified. The football News project is NOT 100% populated.** This is the recovery anchor for the News Fixtures / Results / Standings work, not a claim that every competition or club has all upstream data.

## Exact production versions

Frontend repository `macamala/allball-frontend`, branch `master`, source **be88be88d69014c1d47da7319ae4f5c761e8cbae**. Clean release branch `audit/news-data-final-release-20261003`. Parent data recovery commit **a20c5d89a5dd9116a62aec7888c1804567713de9**, based on previous production **5e2d799c38d22ac709644dcbc7646bfc40f3559b**. Only nine News UI/helper/test/style files changed; no audit workflows were merged into master.

Actual Railway frontend deployment **463dd58d-2ffa-4fcd-a6d5-27c815b8132f**, SUCCESS, created 2026-10-03T09:44:35.164Z and settled 09:45:13.965Z. Direct deployment metadata confirms the exact source hash and master branch. Automatic GitHub deployment was used; this continuation made **zero Railway agent calls** and changed no Railway variables, budgets, source pins or service configuration.

Frontend Railway project `d2187a78-90d0-437a-871b-10e16ba8d07c`, environment `52ceaa71-df43-4275-9ebe-6c19d4437461`, service `df4b231a-fcbc-4d89-bef8-d9028d03b473`.

Dedicated News backend remains **54b945d5d8527ef376832e59c7213aeb734613be**, branch `ops/news-free-probe-20260926`, deployment **b5b54557-ed60-4fae-9934-a0b755098c8c** (07:48:12Z), unchanged in this continuation. Shared API deployment **a6018808-ec70-44a9-8ddc-5a65b30f9c57** and results-worker deployment **25287c7e-08a8-46f8-aa3b-0d85ba6eaf53** remain unchanged from 27 September. Final direct status shows no staged or pending changes. The old unrelated crashed audit service was not modified.

No Live Scores code, shared collector configuration, result records or database maintenance were directly changed. The News client uses existing public GET routes only. These existing server routes can perform their normal cached-table refreshes; a GET-only client audit is NOT proof that the server internally performs zero cache writes.

## Shipped News data changes

### Local dates, seasons and cancelled requests

Fixtures and Results now have From / To / Apply dates / Today / All available dates controls. Selected calendar days use the reader's timezone and correct daylight-saving boundaries, not a fixed 24-hour offset. Dates must be valid, ordered and bounded to at most 93 calendar days. Date scope and filter state survive switching between News data tabs; changing to another competition resets the component safely.

Selected-date reads use `/sports-data/events` with exact sport, competition and ISO date boundaries. The response must match the requested scope. Incomplete snapshots remain labelled partial. The public snapshot's `complete` flag means the stored response is complete for that query, not that every upstream fixture is present.

Season spellings `2026-2027`, `2026/2027` and `2026/27` are treated as equivalent only when the explicit years are consecutive. Unlabelled seasons remain unlabelled. Fixtures are filtered locally against their actual season fields rather than failing because the server expects another separator spelling. Calendar-year competitions, different years and Apertura/Clausura are not merged.

Request cancellation now settles promptly even when the transport ignores AbortSignal. Cached results are isolated by exact competition, season and selected date window. Incomplete empty responses cannot erase a retained valid snapshot; a genuinely complete empty response remains empty. Offline refresh keeps the last loaded records and reports the failure; normal refresh resumes when the connection returns.

### Existing identity assets, not guessed scores

The News view now reuses real club crests already present in the exact same competition payload, or compatible same-competition cached identity data. Explicit FC/AFC/FK/CF affixes can be matched; Women, B, II and youth qualifiers are preserved. Conflicting team identities are not merged. Cached identity-only metadata is bounded and contains no scores.

A complete 82-competition public-data audit measured **1,384 match rows missing at least one team crest before presentation recovery, 527 after**: **857 match rows improved**, including all **844** incomplete Championship rows in that response. These are match-row occurrences, NOT 857 unique clubs and NOT proof that every external image URL has been decoded. Actual visible Championship crest decoding was separately verified in the production browser at all three tested widths.

Competition artwork is reused only from supplied metadata or an unambiguous same-competition record. Existing numeric fields and team names are not changed. Table synonyms such as won/wins are mapped only when the original value exists; points, goal difference and missing statistics are never calculated or filled with zero from an incomplete match list.

Stale, partial and unavailable data have explicit notices. A frozen live flag with a stale observation is shown as awaiting confirmation, not guessed as a final score. Non-exact kickoff precision is labelled Time TBC. Redundant Round/Matchday prefixes are avoided.

### USL table identity

The exact country-qualified fallback `football-usa-usl-championship` is now an accepted News equivalence for `usa-usl-championship`. Bare ambiguous league-name guesses and other championships remain rejected. Populated canonical data wins; aliases must never overwrite it.

At 09:43:20.837Z the public canonical USL key itself returned **25 rows, season 2026, 13 Eastern and 12 Western teams, zero missing logo URLs**. Thus this is a verified stable fallback and correct conference presentation, not evidence that this patch alone created a previously absent table. Do not add a fictitious +1 to the full audit's table count.

## Regression gates and production browser proof

Main release gate **37113394573**, SUCCESS, artifact **11270406693** (`news-data-recovery-release-20261003`): **367 non-App tests**, production build, all **66 existing App route tests in isolated processes**, exact changed-file manifest, all 82 competition data reads and real selected-date requests. The local all-in-one App run was too slow; isolated route processes provided a complete 66/66 check rather than omitting cases.

Final USL child gate **37113963649**, SUCCESS, artifact **11270456945** (`news-data-usl-final-20261003`): **372 non-App tests**, production build and actual canonical-first table proof. The five additional tests cover the exact alias, conference preservation, existing canonical precedence, incorrect sport and incorrect season. Total retained frontend cases checked in this release sequence: **438 (372 + 66)**. The 66 route tests were run on the main recovery parent; they were not rerun a second time solely for the one-line USL mapping child.

**Final actual production browser gate 37114635575 — SUCCESS**, artifact **11270313067** (`news-data-verified-browser-20261003`), recorded **2026-10-03T09:56:49.815442Z**:

- 15 page checks: EPL, Championship, Serbia Superliga, UEFA Nations League and USL Championship at widths **1440, 390 and 320**.
- **45 Fixtures/Results/Standings checks**, no page script errors or horizontal page overflow.
- **48 group checks**: all **14 Nations League groups** and both **USL conferences**, at all three widths. Displayed team identities and points were compared with the exact public table responses, not with guessed tables. This checks presentation consistency, not independent upstream sporting accuracy.
- Date selection checked for EPL, Championship and Serbia on all widths, including persistence across tabs and rejection of reversed dates without erasing records.
- Selected Sydney-local 1 September–31 October correctly requested `2026-08-31T14:00:00.000Z` to `2026-10-31T12:59:59.999Z`. Stored snapshots contained EPL **49**, Championship **178**, Serbia **44** records. These are mixed-status stored records, not all final results; displayed result rows are separately recorded in the artifact.
- EPL offline refresh retained the same result IDs and recovered successfully after connectivity returned at all three widths.
- Both crests on the tested visible Championship fixture decoded successfully. Hidden lazy-loaded cancelled/awaiting rows were not treated as images that must load before being opened.
- No mocked/intercepted API data, injected CSS or client sports-data write requests. Mobile screenshots were visually inspected.

The first browser harness failed on an overly broad image selector that included intentionally hidden lazy rows; the second expected an absent-table explanatory notice to outrank the separate stale notice. Both were test-harness assumptions, not grounds to invent a Championship table. The final harness still requires zero table rows, the explicit unavailable-table heading, actual visible crest decoding, matching source points and all date/offline checks. Product code was not changed merely to hide those test failures.

## Measured coverage — still incomplete

Full data audit recorded **09:37:42.626Z** (82 concrete competitions; the other four News menus are broad topics):

| Measurement | Observed |
|---|---:|
| Concrete competition menus read | 82 |
| Menus with table rows | 52 |
| Menus with match records | 72 |
| Menus with upcoming fixtures | 46 |
| Menus with results | 70 |
| Data read errors | 0 |
| Remaining match rows with a missing team crest | 527 |

Source windows and seasons differ. A returned row does not mean a complete current-season database. Some international/cup competitions are inactive or have no applicable league table; active-league gaps such as Championship must still be investigated rather than labelled complete.

The latest News article read in this continuation, **09:45:42.043584Z**, workflow **37114129679** news job, artifact **11270282483** (`news-data-production-news-20261003`): **86 menus, 36 populated, 26 with a past-24-hour story, 50 empty**, zero public read errors or returned league/sport-field mismatches. Up to three articles per menu were sampled. Those field checks do not establish semantic accuracy of every article or broad coverage of every club.

Existing automatic News publishing continued independently. Direct worker logs include a normal 09:26:56 cycle with five publications and 15 attempts. No new AI writing or extra paid requests were triggered by this frontend work. Prior club-diversity scheduling and provider spending limits were retained. Its 09:21:59 club snapshot reported 50 roster leagues / 864 clubs, 41 clubs with 24-hour news and 81 with seven-day news; those are timestamped partial coverage measurements, NOT all clubs filled.

### Tables absent in the complete data snapshot

england-championship; spain-la-liga-2; italy-serie-b; serbia-prva-liga; belgium-challenger-pro-league; greece-super-league; turkey-first-league; switzerland-challenge-league; croatia-prva-nl; czech-second-league; austria-second-league; denmark-first-division; romania-liga-2; argentina-primera-nacional; japan-j1-league; south-korea-k-league-2; australia-a-league-men; saudi-first-division; uefa-europa-league; uefa-conference-league; uefa-euro; fifa-world-cup; fifa-club-world-cup; conmebol-libertadores; afc-champions-league-elite; caf-champions-league; belgium-cup; fifa-womens-world-cup; uefa-womens-nations-league; uefa-under-21-euro.

### No match records in the same snapshot

spain-la-liga-2; serbia-prva-liga; croatia-prva-nl; uefa-euro; fifa-world-cup; fifa-club-world-cup; belgium-cup; fifa-womens-world-cup; uefa-womens-nations-league; uefa-under-21-euro.

Largest remaining match-row crest gaps: CAF Champions League141, A-League Women113, Eredivisie54, Serbia Superliga47, AFC Champions League44, Sudamericana25 and MLS21. Conflicting/unavailable identity data must not be covered by fabricated crests or inappropriate generic replacements.

## Recovery and next scope

Resume from frontend master **be88be88d69014c1d47da7319ae4f5c761e8cbae**, comparing current heads before promotion. The audit branch contains staging scripts and one-off workflows and must NEVER be merged wholesale into production. Preserve the separately deployed News backend and Live Scores services.

The remaining work is actual source coverage and trustworthy missing data, not rebuilding the date controls or rerunning the same setup. Distinguish applicable live tables from inactive cups; investigate exact existing competition/source mappings before adding any equivalence. The public registry also has a country-qualified Japanese J.League key with ten retained games, but it overlaps canonical J1 games with different provider IDs: it was inspected and NOT blindly merged. No table was supplied there.

Keep admitted News stories, actual source dates, independent validation and existing budget limits intact. Club-roster availability is not news coverage. Fresh candidates are not publications. Do not compute official tables from incomplete fixtures/results, force wrong-sport or youth records into men's leagues, or claim that every club now has news. Preserve all unresolved article-quality, deduplication and identity-asset items from previous backend checkpoints.
