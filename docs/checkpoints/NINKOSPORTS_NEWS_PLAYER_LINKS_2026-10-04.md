# NinkoSports News — player profile recovery, 4 October 2026

Status: **DEPLOYED AND VERIFIED FOR THIS RELEASE. The complete football News project is NOT finished.** This supersedes the deployment and pending-browser wording in the earlier News restore checkpoint. Do not confuse verified example profiles with universal coverage of every league, club, player, fixture or table.

## Exact running source and safety boundary

Frontend `macamala/allball-frontend`, `master`: **45c3f5eb7cb65cd56f00d35e2e4498ceb1e04f48**. Clean release branch: `release/news-player-resolution-20261004`. Parent **12f5180c451d596ce5a13b96172a6fcdb96d1da2** had the restored appearance and verified team/article identity features.

Actual Railway frontend deployment **56abf769-d140-4e73-a66b-deaff4500318**, **SUCCESS**; created **2026-10-04T04:43:22.079Z**, settled **04:44:02.991Z**. Direct deployment metadata verifies the exact commit and master branch. This was an automatic deployment following a verified fast-forward, not a Railway-agent operation.

Frontend project `d2187a78-90d0-437a-871b-10e16ba8d07c`, environment `52ceaa71-df43-4275-9ebe-6c19d4437461`, service `df4b231a-fcbc-4d89-bef8-d9028d03b473`.

Dedicated News worker remains at **b62ecd517f0e6b6373145c4a745aa7ff4a669748**, deployment **a4831f1c-c6b8-45df-ac3f-e193cf21266b**. Shared API remains deployment **a6018808-ec70-44a9-8ddc-5a65b30f9c57**, results-worker remains **25287c7e-08a8-46f8-aa3b-0d85ba6eaf53**; both unchanged since 27 September. Direct final backend environment status showed no pending or staged changes. The unrelated old crashed audit service was not touched.

No Railway-agent calls, new services, credentials/variables/budget changes, paid model requests or direct sporting-data writes were made in this continuation. Public read endpoints may perform their own existing cache refreshes internally; GET-only client traffic is not a guarantee of zero internal server cache writes.

## What changed

Some named players cannot be linked through recent match lineups, especially when injured or absent. Their shared Live Scores profile must not be fabricated or assigned a random match. The News context now optionally verifies the player through two exact records from the same provider: the current club squad and that player's separate profile. This is a consistency check across two records, NOT a claim of independent-provider corroboration.

Verification requires matching club id/name, country, gender and explicit season, followed by matching player id, full name, date of birth, gender, current team and non-coach status. Coaches, unrelated widgets, ambiguous identities and mismatched squads remain excluded. The general resolver is not keyed to the two sample players used in acceptance.

Verified players missing the existing lineup path receive an article-scoped **`/football/players/:playerKey?article=:slug`** page. Existing lineup-backed `/players/:playerKey?event_id=...` links remain unchanged. No fictitious event id is assigned to a player with no match witness.

The new News page shows the verified portrait, current club link, source-supplied player facts, explicitly labelled season statistics and career/club history. Missing numerical values remain absent rather than zero. Previous-season data is not relabelled current. Data check time is separate from the article publication time. Article text, title, id and publication date are retained.

The page reuses existing entity styles. Home, Football, the restored mobile menu and the existing PlayerPage, TeamPage, MatchPage and LiveScoresPage were byte-compared unchanged in the gate. The only App changes add the News-specific route/import. No new Refresh news toolbar was added. Existing fixtures/results/standings helpers were not altered.

The source reader is read-only, fixed-host, anonymous, and bounded: two active source requests, a limited queue, strict integer IDs, size/type limits, seven-second source deadlines, fifteen-minute successful source cache, five-minute failed-source cooldown and memory caps. Portrait URLs are accepted only after fetching PNG content with a valid signature and sane dimensions; browser acceptance separately decoded the actual photos. No search-result or publisher-logo substitute is inserted.

## Regression and release evidence

Release workflow **37177521499**, SUCCESS; artifact **11293968095**, `news-player-release-20261004`.

**661 passing checks: 507 frontend cases + all 66 existing App route cases + 88 News server cases**, no failures. Production build passed. Exact checksum manifest retained in the artifact. Clean release contains eight files only; audit workflows were not promoted to master.

Direct pre-deployment source proof at **04:40:16.699Z**:

| Existing article | New verified player | Facts | Season stat rows | Career rows |
|---|---|---:|---:|---:|
| 22928, Rade Krunic returns to training for Crvena zvezda | 438456, Rade Krunic | 7 | 8 (2026/2027) | 7 |
| 22929, Samuel Lino offers to fill Flamengo's midfield role | 438647, Giorgian de Arrascaeta | 6 | 8 (2026) | 3 |

Actual profile names retain their accents in the site and artifacts. The Rade context was not partial; the Flamengo context had an incomplete unrelated context read but the new player identity/profile was fully verified. Cold context generation took about 19 and 36 seconds in that source probe. Do not claim instantaneous linking or that the whole Flamengo context is complete.

## Actual production navigation acceptance

Workflow **37177865633**, SUCCESS; artifact **11292954524**, `news-player-production-20261004`, recorded **04:46:33.406519Z**.

**15/15 actual production checks** at widths **1440, 390 and 320**:
- Both new article links opened the correct News player pages, decoded their exact source portraits and displayed source-matched fact/stat/career values.
- Current-club links opened the exact existing team profile; browser back and Back to article returned correctly.
- Original article text and inline linking were verified without rewritten copy.
- Existing Bruno Fernandes match-scoped player navigation remained available.
- Home and Football loaded real lead photographs with no Refresh news toolbar or SoccerNews shared-logo images.
- No browser script errors, horizontal page overflow, mocked responses, injected styles or client sporting-data write requests.

The 390px Rade profile and 320px Arrascaeta profile screenshots were visually inspected. The artifact contains complete page screenshots.

The earlier restoration browser run **37176121525**, artifact **11293896041**, was also inspected this continuation: **30/30 page checks and 33 actual profile/match clicks** at 1440/390/320, completed **04:11:20.799779Z**. This proves the preceding layout/photo/team-link restoration; it must not be added to the new release's 15 check count as if it were rerun.

## Cross-league real-link evidence

Workflow **37177978312**, SUCCESS; artifact **11294220142**, `news-player-cross-league-proof-20261004`, recorded **04:47:14.372199Z**.

Six actual published stories yielded **eight verified player links**, with no missing expected identities or profile-read errors: Rade Krunic, Samuel Dias Lino, Giorgian de Arrascaeta, Axel Witsel, Roope Paunio, Bruno Fernandes, Cristiano Ronaldo and Martin Terrier. New article-scoped profiles were verified against their context facts; existing profile links were fetched using their actual event id and checked against the returned player id. This is a sample, not a count of all website players.

## Photograph screenshot follow-up

The first new-profile browser screenshots did not wait for every article hero photograph before capture. They are profile/navigation proof, not acceptance of every article image. A separate actual Rade article diagnosis, workflow **37178151178**, artifact **11292904974**, recorded **04:51:03.859684Z**, found the real Novosti image returned HTTP200/image/jpeg and its hero displayed at 366x207px, with no image failures. No source-image replacement or referrer/security bypass was applied.

Follow-up workflow **37178276662** (`news-player-article-complete-view.yml`) explicitly waits for BOTH the real article hero to decode AND the new player link to become available, then captures both articles at all three widths. **Read its final result before claiming simultaneous image/link acceptance.** At creation of this checkpoint it was still running. Its final result belongs in a companion completion note if successful.

## Remaining scope, not closed by this release

The general requirement for complete news/data and widespread club coverage across every league remains open. No new 86-league inventory or full standings/fixture coverage measurement was performed this continuation, so previous counts must not be presented as current.

Unverified/ambiguous player identities remain unlinked; the resolver does not guarantee every name in every article is clickable. Historical club names in the new career section are source facts, not yet independently resolved clickable club profiles. Full match statistics, transfers, every historical season and every team roster are not guaranteed by these example profiles.

The reader is source/network dependent and cold context creation can take time. Do not remove identity checks, invent profile facts or increase provider budgets to improve completeness numbers. Ordinary News worker publishing continued independently; this release did not generate new articles or reset publication dates.

Resume from clean production master **45c3f5eb7cb65cd56f00d35e2e4498ceb1e04f48** after rechecking current heads. Never merge the audit branch wholesale. Preserve all preceding football News/data work and leave shared Live Scores code, services and record storage unchanged.
