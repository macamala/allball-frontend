# NinkoSports Football News — verified player release, 4 October 2026

**Latest recovery anchor: DEPLOYED, with actual browser acceptance complete for this release. Overall football News/data coverage is still incomplete.** This supersedes the pending-check wording in `NINKOSPORTS_NEWS_PLAYER_LINKS_2026-10-04.md`, which retains implementation and safety details.

## Active production

Frontend `macamala/allball-frontend` **master: 45c3f5eb7cb65cd56f00d35e2e4498ceb1e04f48**. Clean release: `release/news-player-resolution-20261004`. Railway deployment **56abf769-d140-4e73-a66b-deaff4500318**, SUCCESS, created **04:43:22.079Z**, settled **04:44:02.991Z**, 4 October. Direct Railway metadata matched the exact commit. Previous parent was **12f5180c451d596ce5a13b96172a6fcdb96d1da2**.

The News worker remains at **b62ecd517f0e6b6373145c4a745aa7ff4a669748**, deployment **a4831f1c-c6b8-45df-ac3f-e193cf21266b**. Shared API deployment **a6018808-ec70-44a9-8ddc-5a65b30f9c57** and results-worker deployment **25287c7e-08a8-46f8-aa3b-0d85ba6eaf53** are unchanged from 27 September. No Railway agent, new service, key/variable/budget change, paid writer request or direct sporting-data mutation was used.

## Visible result

Existing article **22928**, `rade-kruni-returns-to-training-for-crvena-zvezda`, now links **Rade Krunić (438456)** to an article-bound News player page with a real portrait, seven supplied player-detail fields, eight explicitly season-labelled statistics and seven career records. Its current-club link opens the existing Crvena zvezda profile.

Existing article **22929**, `samuel-lino-offers-to-fill-flamengos-midfield-role-during-arrascaetas-absence`, now also links **Giorgian de Arrascaeta (438647)** to a verified News profile with portrait, six detail fields, eight season statistics and three career records. Samuel Lino's existing match-backed profile link is retained.

The new route is **`/football/players/:playerKey?article=:slug`**. It is used only when exact current squad and player records support the identity. This is a general resolver, not manual data for only those two players. It uses two records from the same provider; it does not claim independent-provider corroboration. Missing numbers and identities are not invented.

The original article wording, dates and IDs are unchanged. Data-check timestamps are shown separately. Existing `/players/`, team and match pages remain unchanged. Home, Football and restored mobile navigation remain unchanged, and the unsolicited Refresh news bar stays removed. The known SoccerNews publisher-logo image remains blocked rather than being treated as a story photograph.

## Release and production proof

**Code/build gate 37177521499: SUCCESS**, artifact **11293968095**, `news-player-release-20261004`: **661 passing checks** — 507 frontend cases, all 66 existing App-route cases and 88 News server cases. The eight-file clean release passed exact file-boundary and unchanged-Live-Scores-page checks. No audit workflows were merged into master.

**Production navigation gate 37177865633: SUCCESS**, artifact **11292954524**, `news-player-production-20261004`, at **04:46:33.406519Z**: **15/15 checks** at **1440, 390 and 320 pixels**. Actual article links, decoded portraits, exact source-matched player facts/statistics/career values, current-club navigation, browser back, Back to article, old Bruno Fernandes profile navigation, Home and Football were exercised. No script errors, horizontal page overflow, mocked API responses, injected CSS or client sports-data write requests. Mobile profile screenshots were visually inspected.

**Cross-league gate 37177978312: SUCCESS**, artifact **11294220142**, `news-player-cross-league-proof-20261004`, at **04:47:14.372199Z**: six real published stories, **eight verified player destinations**, no missing expected IDs or read errors. Names: Rade Krunić, Samuel Dias Lino, Giorgian de Arrascaeta, Axel Witsel, Roope Paunio, Bruno Fernandes, Cristiano Ronaldo and Martin Terrier. The Flamengo context retained a partial-read flag for another context read; its two named player destinations were nevertheless verified. Do not report that entire context as fully populated.

**Simultaneous article-photo/link gate 37178276662: SUCCESS**, artifact **11294580191**, `news-player-article-complete-view-20261004`, at **04:54:19.671585Z**: **6/6 actual public checks** for the two articles at all three widths, explicitly waiting for BOTH the original article photograph to decode and the player link to become available. Rade's real Novosti image decoded **906x513**; the Flamengo story image decoded **1200x800**. Rendered height remained nonzero and above 100px at every width. No publisher-logo substitute. The 390px Rade article screenshot was visually inspected and shows the real photo together with underlined linked player/team names.

The first navigation screenshots had not waited for all story images; they must not be used to claim every article photo had loaded. The follow-up above establishes simultaneous rendering of the actual images and links. No extra product change or security/referrer bypass was applied to make the photograph appear.

Earlier restoration browser evidence **37176121525**, artifact **11293896041**, independently passed 30 checks and 33 actual profile/match clicks before this release. Those are not additional reruns of the current 15 navigation checks.

## What remains open

This work adds trustworthy links and supplied profile data to existing stories. It does not create new news articles or complete every football league, club roster, standings table, fixture window, identity asset or historical record. There was no fresh complete 86-menu inventory this continuation; do not present earlier empty/populated counts as current.

Not every person in every article can yet be linked. Ambiguous or unsupported identities stay unlinked. Historical clubs in the new career section are text records until their destinations are separately verified. The first uncached article context may take tens of seconds; the article remains readable while it loads. Do not promise instantaneous links or universal profile completeness.

Resume from the clean source above after checking current heads. The audit branch `fix/news-player-resolution-20261004` contains one-off tests/checkpoint files and must not be promoted wholesale. Preserve original appearance, existing automatic News publishing, budget caps and the separate shared Live Scores services.
