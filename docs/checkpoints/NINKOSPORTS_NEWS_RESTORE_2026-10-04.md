# Football News appearance and entity recovery — 4 October 2026

Status: deployed; final production browser acceptance is still running. Do not describe all football News, all clubs, or all player profiles as complete.

## Production source

Frontend master and clean release branch `release/news-restore-entities-20261004`: **1b98219db207c7d7240ea024e60cbe972129afc6**. Railway successful deployment **e947c551-9d1b-43f1-8076-bd61b718aa0b**, created 2026-10-04T03:18:53.731Z, settled 03:19:27.577Z; direct deployment metadata confirms this exact commit. Previous source was 06a6c116ada23aa233e49776c4545ada4d193c87.

News worker remains on **b62ecd517f0e6b6373145c4a745aa7ff4a669748**, successful deployment **a4831f1c-c6b8-45df-ac3f-e193cf21266b**, which repaired publisher-logo article images during the preceding work. The shared API and results worker must remain on **a6018808-ec70-44a9-8ddc-5a65b30f9c57** and **25287c7e-08a8-46f8-aa3b-0d85ba6eaf53** respectively. No shared Live Scores pages, API clients or sporting records were modified for this frontend release.

## Visible corrections shipped

Removed the unsolicited visible Refresh news bar from Home, Football and league News pages. Automatic refreshing continues without a toolbar. Restored FootballNewsMenu JSX and CSS byte-for-byte to the pre-toolbar source at 0180f4b9aee08b4835e3eb7b207a9ecc4dabe12d. Retained the existing News data tabs and their earlier valid data improvements.

Blocked the known SoccerNews publisher-logo URL even from cached News lists. Articles 22943 (Bruno Fernandes/Portugal) and 22940 (Canada/Jesse Marsch) were verified through the public API with genuine same-article photographs; their IDs, headlines and source publication dates remain unchanged. The backend source-photo repair did not invent a generic replacement.

Added a bounded read-only News context endpoint to the existing frontend server. Teams are identified from exact football records; player IDs are tied to verified match lineups and names, not guessed name-only lookups. Matching text becomes a link without rewriting its wording. Related match links are labelled related, not asserted to be the exact event described by the story. Fixtures/Results team names also open existing team profiles. Standings retain existing team links.

The linked destination pages are the existing, unchanged NinkoSports team/player/match pages. Linking them does not imply a complete current squad, every transfer, every player statistic, or every historical season. Missing or ambiguous identities stay unlinked rather than pointing at the wrong person.

## Verification completed

Clean release gate **37173519520** SUCCESS; artifact **11292327302**, `news-restore-final-20261004`: **489 frontend cases + 66 existing App-route cases + 50 News server cases = 605 checks**, all passing; production build succeeded. No audit workflows were promoted to master.

Original gate 37172618441 passed all code/build checks but failed a transient initial article-read timeout. That failure was not treated as success. The final release adds one bounded retry only for temporary idempotent GET failures, exact allowed paths, coalesced requests, response-size/type checks and invisible client recovery. Permission failures, malformed payloads and rate limits are not retried.

Actual source verification at **03:17:21.873Z**: article22943 resolved three teams, two players and six related matches; article22940 resolved six teams, one player and six related matches, both without partial-read flags. Bruno Fernandes ID422685 and Cristiano Ronaldo ID30893 returned available player profiles using their exact event context. These are specific verified examples, not universal coverage counts.

## Pending evidence to finish before final report

Production browser run **37173874338**, workflow `news-restore-production.yml`: real Home/Football/directory appearance, decoded article photographs, team/player/match clicks, News fixture and table team links at 1440/390/320 pixels. Read its final results and inspect screenshots. Script `audit/verify_news_restore.py` is pinned at 16ce42280975bef660603e6474f9d6fca0f0ca77. No request interception or CSS injection is used.

Separate `news-entity-public-sample.yml` checks eight different public football stories and the latest100 photo URLs. Record actual coverage and failures; do not invent complete entity coverage when a source profile is absent.

All deployment steps in this continuation used direct GitHub/Railway tools, with zero Railway-agent calls, no new services, no variable/key changes and no additional paid writer calls. Current frontend production state should be compared before any further patch so other sessions' work is preserved. Never merge the audit branch wholesale.
