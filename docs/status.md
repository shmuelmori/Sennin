# Sennin – Build Status

The POC build plan, split into steps. The spec (`docs/Sennin – POC Specification.md`) is the source of truth. This file only tracks order and progress.

## How to use this file

- At the start of a session, pick the next unchecked steps that fit in one session. Small steps can share a session, and a large step can be split across several.
- When a step is merged into `main`, change `[ ]` to `[x]` and add the date and branch, e.g. `[x] **2.1 …** (2026-11-10, feature/duration-parser)`.
- A step counts as done only when the "Before calling a task done" checks in `CLAUDE.md` pass (typecheck, lint, `lib/` tests, and a phone test for anything touching the feed or player).
- If a step changes a decision, update the spec in the same branch.
- Steps that need a new dependency are marked **(dep)**. Ask the user before installing it.

**Next step:** 9.1

---

## Phase 0 – Project setup

- [x] **0.1 Scaffold the Expo app** (2026-11-05, chore/project-scaffold)
  Expo + TypeScript (strict) + Expo Router in the repo root. Create the folders `app/`, `components/`, `hooks/`, `lib/`, `services/`, `db/`, `theme/`.
  *Done when:* a placeholder screen opens in Expo Go on the Galaxy S24 FE.
  *Result:* opens on the phone with Expo SDK 58. The phone runs the app right-to-left (Hebrew system language): the header title sits on the right. Keep this in mind for the overlays (7.1) and the Hebrew check (9.3).
- [x] **0.2 Lint and test tooling** (dep) (2026-11-05, chore/project-scaffold)
  Get `npx expo lint` working, and add a unit test runner for `lib/` (e.g. `jest-expo`).
  *Result:* ESLint 9 with `eslint-config-expo` plus `no-explicit-any` as an error. Run it as `npx expo lint .`, because without the `.` it skips `lib/`, `hooks/`, `services/`, `db/` and `theme/`. Jest 30 with the `jest-expo/android` preset.
  *Done when:* `npx tsc --noEmit`, `npx expo lint` and one sample test all pass.
- [x] **0.3 API key setup** (2026-11-05, chore/api-key-setup)
  Add `.env.example` with `EXPO_PUBLIC_YOUTUBE_KEY=`. Confirm `.env` is git-ignored. Restrict the key to the YouTube Data API in Google Cloud (manual step for the user).
  *Done when:* the app can read the key at runtime and `.env` doesn't show up in `git status`.
  *Result:* `.gitignore` needed `!.env.example`, because `.env.*` also matched the example file. `readApiKey()` in `services/youtube.ts` reads the key, and `checkApiKey()` in `lib/apiKey.ts` reports it as missing or malformed (not the 39-character `AIza…` format). The Status screen shows the result and the key's last 4 characters. A test `videos.list` call returned HTTP 200. Leave the key's Application restrictions at None: requests from Expo Go don't carry an Android app ID, so an "Android apps" restriction would block them. Restart with `npx expo start --clear` after editing `.env`.
- [x] **0.4 Theme and navigation skeleton** (§4, §11) (2026-11-05, chore/api-key-setup)
  Put the palette and spacing in `theme/`. Add three empty screens (Feed, Sources, Status) with navigation between them.
  *Done when:* all three screens open on the phone in the §11 colors, with no hex literals outside `theme/`.
  *Result:* `theme/index.ts` has the palette, spacing, radius and font sizes. `theme/navigationTheme.ts` colors the header and backgrounds. Navigation is a stack (now in spec §4): Feed is home, and Sources and Status open from Teal Mist header buttons with fade transitions. `app.json` still has template hex colors for the adaptive icon and splash screen. Replace them in 9.2.

## Phase 1 – Player spike (do the riskiest part first)

The spec (§10) calls the player the highest risk: "test in the first week". This phase answers POC question 3 before any other feature is built.

- [x] **1.1 Paging feed with hard-coded Shorts** (§3, §4, F7) (dep) (2026-11-05, feature/player-spike)
  A vertical `FlatList` with `pagingEnabled` and ~15 hard-coded Short IDs, playing through `react-native-youtube-iframe`. Mount a player only for the current item and its neighbors.
  *Done when:* swiping up and down works on the phone, and the YouTube branding and controls are fully visible.
  *Result:* works on the phone: one video per swipe, the current video starts on its own, the previous one pauses, and YouTube's title, logo and controls are fully visible. `react-native-youtube-iframe` 2.4.1 needed four fixes, all in `components/ShortPage.tsx`:
  - By default it loads its player page from `lonelycpp.github.io`. `useLocalHTML` builds the page in the app, so only YouTube is contacted. `baseUrlOverride` (`https://sennin.local/`, never requested) gives the page an origin so YouTube gets a Referer. No "Error 153" so far.
  - Its page is a 16:9 box. Injected CSS stretches the player to fill the 9:16 WebView.
  - On Android, `react-native-webview` delivers `postMessage` on `document`, but the local page listens on `window`, so play and pause silently did nothing. An injected script forwards the messages to `window`. `forceAndroidAutoplay` (desktop user agent) is not needed.
  - Its types use `React.VFC`, which React 19's types dropped, so the player was typed as `any`. It's recast to its own props.

  The 15 Shorts in `lib/spikeShorts.ts` come from 3Blue1Brown, Epic History and Gotham Games (Gotham Games had only 1 Short in its last 25 uploads). The Shorts length limit was raised from 90 s to 3 minutes in the spec (§5, §9).
- [x] **1.2 Measure switch time** (§8) (2026-11-05, feature/switch-timing)
  Log the time from swipe end to playback start. Run about 30 switches on the phone.
  *Done when:* the results are recorded under "POC results" below. If fewer than 80% are under 1 s, try fixes (neighbor preloading, a lighter WebView setup) before going on.
  *Result:* target not met: 1 of 12 switches under 1 s (8%), median 1.13 s, slowest 3.2 s (one outlier; the rest were 1.0–1.7 s). `hooks/useSwitchTimer.ts` measures from finger lift to the player's "playing" event and logs `[switch]` lines to the Expo terminal. Each switch splits into:
  - the page snap animation, a steady ~0.26 s;
  - the new video starting, ~0.75–0.9 s. Neighbors are only cued (page loaded, no video fetched), so playback still has to buffer;
  - going back to a video that already played took 0.55 s in total, because it was already buffered.

  The user ran 12 switches instead of 30, found the switching good in use, and chose to record the result and move on without fixes. Ideas for 7.5 and 7.6: start playing when the finger lifts instead of after the snap (saves ~0.25 s, which would have put about 2 of 3 switches under 1 s). Warming up neighbors by playing them muted off screen would cut more, but check YouTube's policies first, since hidden playback may count as views.

## Phase 2 – Pure logic in `lib/` (each with unit tests)

- [x] **2.1 ISO 8601 duration parser** (2026-11-06, feature/pure-logic)
  `PT1M5S` → 65. Handles hours, missing parts and bad input.
  *Result:* `parseDurationSec` in `lib/duration.ts` returns `null` for bad input. Live and upcoming streams report `P0D`, which parses to 0. Weeks and days are supported. Years and months are rejected because their length in seconds is ambiguous.
- [x] **2.2 Channel input parser** (F1) (2026-11-06, feature/pure-logic)
  Accepts `@handle`, `youtube.com/@handle`, `youtube.com/channel/UC…`, and mobile links. Returns a handle, a channelId or an "invalid" reason.
  *Result:* `parseChannelInput` in `lib/channelInput.ts` also handles the `?si=…` on share links, channel tabs (`/@handle/shorts`) and percent-encoded Hebrew handles. Video links and old `/c/` and `/user/` links get their own reasons, so 5.2 can show a helpful error. A bare name without "@" is rejected. Links are parsed by hand, because React Native's `URL` doesn't fully support `hostname` and `pathname`.
- [x] **2.3 Topic and word constants** (§2, §5) (2026-11-06, feature/pure-logic)
  The 2 topics with their keywords, plus the blocked-words list.
  *Result:* the second topic is now Claude Code instead of Quantum Computing. The lists are in `lib/topics.ts` (English and Hebrew keywords). Blocked words use narrow phrases ("reacts to", "reaction video") instead of plain "reaction".
- [x] **2.4 Filter rules** (§5, F5) (2026-11-06, feature/pure-logic)
  One function per rule, each returning pass or a rejection reason: length ≤ 180 s, vertical (height > width), embeddable, keyword (single-topic channels exempt), blocked words, minimum 1,000 views (skipped for videos from the last 48 h), live stream. Plus a runner that applies all rules and collects the rejections.
  *Result:* `lib/filterRules.ts` has one `check…` function per rule, each returning `null` or `{rule, detail}`. `applyFilters` logs each video under the first rule that rejects it, in the order given in spec §5. Matching lives in `lib/textMatch.ts`: whole words, any case, and Hebrew words may follow up to 3 prefix letters. The matcher uses Unicode regexes (`\p{L}`). Compiling them with `hermesc` from `node_modules` showed that Hermes accepts them. The input type `VideoCandidate` is what step 4.1 must map `videos.list` responses to.
- [x] **2.5 Dedupe, sort and select** (§5 steps 2, 5, 6) (2026-11-06, feature/pure-logic)
  Remove watched videos and videos already in the list. Sort new-since-last-fetch first, then by views. Return 15 feed videos plus up to 10 in reserve, and fill with older unwatched videos if there aren't enough new ones (§10).
  *Result:* `lib/feedSelection.ts` has `removeSeen`, `sortForFeed` and `selectFeed`. Older unwatched videos aren't a separate step: the sort places them after the new ones. Because videos already in the list are removed, a Refresh always brings different videos. Unwatched videos from the old list can come back in the fetch after that.

## Phase 3 – Storage in `db/`

- [x] **3.1 Schema and seed** (§7) (dep) (2026-11-06, feature/storage)
  Create all six tables on first launch and seed the 2 topics.
  *Done when:* the app starts on the phone and the tables exist.
  *Result:* `expo-sqlite` 58.0.15. On the phone, the `[db] ready` line showed all six tables and 2 topics, and the feed still played (median switch 1.11 s, close to step 1.2). `db/schema.ts` creates the tables and tracks the schema version in `PRAGMA user_version`, so a later change adds a migration step. The topics are rewritten from `lib/topics.ts` on every launch, so the table always matches the code. `DatabaseProvider` (in `app/_layout.tsx`) opens `sennin.db` before the app renders and logs a `[db] ready: …` line to the Expo terminal. Transactions use `withTransactionAsync`: `withExclusiveTransactionAsync` opens a new connection for each transaction, and foreign keys are off on that connection.
- [x] **3.2 Queries** (2026-11-06, feature/storage)
  Channels (add, remove, list, set topics), feed items (replace the list, read, update status), watched (insert, check), fetch log (insert, read latest). Removing a channel must not delete its feed items (F2).
  *Result:* one file per table group in `db/` (`channels.ts`, `feed.ts`, `watched.ts`, `fetchLog.ts`). The row types and the `rejectedByRule` JSON format are in `lib/records.ts`. Hooks get the database with `useDatabase()` from `db/DatabaseProvider.tsx`. The `db/` tests run the real SQL on Node's built-in SQLite through `db/testDatabase.ts`, because expo-sqlite's native module doesn't run in Jest.

## Phase 4 – YouTube client in `services/youtube.ts`

- [x] **4.1 Typed API client with a quota counter** (2026-11-06, feature/youtube-client)
  `channels.list` (`forHandle=` or `id=`), `playlistItems.list` (up to 50), `videos.list` (batches of 50, with `maxHeight` so `player.embedWidth` and `embedHeight` are returned). Count units for every call. Handle errors: bad key, quota exceeded, network.
  *Done when:* resolving one real channel and fetching its videos works on the phone, and the unit count is correct.
  *Result:* works on the phone: `@3blue1brown` resolved, its latest 50 uploads all came back with details, 30 passed the filters and 20 were rejected by length. It took 4 units (2 `channels.list`, 1 `playlistItems.list`, 1 `videos.list`) in 1.5 s. Shorts detection looks clean on this channel: every Short reported 608x1080 and every long video 1920x1080.
  - `createYoutubeClient()` in `services/youtube.ts` returns `resolveChannel`, `listUploads`, `getVideos` and `unitsUsed()`. 6.1 creates one client per fetch and writes its `unitsUsed()` to `fetch_log`. A request counts its units once a response arrives, failed ones included. A request with no response (offline, or the 15 s timeout) counts 0.
  - Calls return `{ ok: true, value }` or `{ ok: false, error }` instead of throwing. `lib/youtubeErrors.ts` sorts errors into `noKey`, `badKey`, `keyRestricted`, `quotaExceeded`, `notFound`, `network` and `other`, and `describeYoutubeError` gives the text for 5.2 and 6.2. A bad key is reported as `API_KEY_INVALID` in the ErrorInfo details, not in the old `errors[].reason`.
  - An unknown handle returns HTTP 200 with no `items`, which the client reports as `notFound`.
  - `player.embedWidth`, `embedHeight` and `statistics.viewCount` arrive as strings. `toCount` in `lib/youtubeResponses.ts` reads them.
  - `getVideos` returns `FetchedVideo` (a `VideoCandidate` plus `channelTitle`). YouTube leaves private and deleted videos out, so 6.1 can compare the result with the IDs it sent.
  - The "Test YouTube API" button on the Status screen (`hooks/useYoutubeTest.ts`) is temporary. Remove it in 5.2.

## Phase 5 – Sources screen (F1, F2, F3)

- [x] **5.1 Channel list** (§4) (2026-11-06, feature/sources-screen)
  A `useChannels` hook, plus a list showing each channel's thumbnail, name and topic tags.
  *Result:* `hooks/useChannels.ts` reads the list and updates it at once on a remove or topic change, then saves. If saving fails, it reads the list again. Thumbnails load from YouTube's own image server, so only YouTube is contacted.
- [x] **5.2 Add a channel** (F1) (2026-11-06, feature/sources-screen)
  Paste a link or @handle, resolve it through the API, save it. Show a clear error for invalid or unknown input. Remove the temporary API test button and `hooks/useYoutubeTest.ts` from step 4.1.
  *Result:* works on the phone by @handle and by a pasted share link. Each add costs 1 unit (one `channels.list`) and logs a `[sources] added: <title> (<channelId>), 1 unit` line. Video links, unknown handles and channels already in the list each get their own message, from `lib/channelMessages.ts`. The API test button and `hooks/useYoutubeTest.ts` are removed.
- [x] **5.3 Remove and assign topics** (F2, F3) (2026-11-06, feature/sources-screen)
  Swipe to remove. Assign each channel to one topic or both.
  *Done when:* adding, removing and assigning all work on the phone, and the data survives an app restart.
  *Result:* all of it works on the phone, and the list and topics survived closing and reopening Expo Go. No gesture library was needed: `components/SwipeToRemove.tsx` uses `PanResponder`, with the math in `lib/swipe.ts`. On the right-to-left phone, swiping right uncovers Remove on the left, as intended. Turning off a channel's only topic does nothing (`toggleTopic` in `lib/topicSelection.ts`).

## Phase 6 – Fetch pipeline (F4, F5, F6)

- [x] **6.1 Refresh hook** (2026-11-06, feature/fetch-pipeline)
  Runs the full §5 process: playlist items per channel → dedupe → `videos.list` → filter → sort → save 15 + reserve → write `fetch_log` (each rejected video with its rule, plus quota used).
  *Result:* `runFetch` in `lib/fetchPipeline.ts` runs the process and takes the YouTube calls as a parameter, so its tests use fakes. `hooks/useRefresh.ts` reads the inputs, saves the list and `fetch_log`, and logs `[fetch]` lines. `lib/fetchMessages.ts` builds the log row, the message shown after Refresh and the terminal lines. Channels are read in parallel. A key or quota error stops the fetch; any other error skips only that channel. `getLastCompletedFetchStart` in `db/fetchLog.ts` gives the "new since" time.
- [x] **6.2 Run it for real** (2026-11-06, feature/fetch-pipeline)
  Wire the "Refresh" button with loading and error states. Test with real channels.
  *Done when:* one fetch takes under 60 s and under 100 units (§8), and `fetch_log` shows the rejections.
  *Result:* targets met, but with only 2 channels. The first fetch read 100 uploads, and 60 passed. All 40 rejections were from the length rule (long videos; the two logged examples ran 32 and 41 minutes). It used 4 units in 1.3 s, and saved 15 + 10. The second fetch skipped the 25 listed videos, checked 75, and saved a different 15 + 10 in 0.8 s, also for 4 units. Nothing failed the vertical rule: every video of 3 minutes or less was vertical. The keyword rule didn't run, because both channels have one topic. `fetch_log` read back with the same counts. A fetch costs 1 unit per channel plus 1 per 50 videos, so 30 channels should take about 60 units. Re-measure with the full channel list in 10.1. The same 40 long videos are checked again on every fetch. They cost no extra units, because they share the `videos.list` batches.

## Phase 7 – Real feed (F7, F8, F9, F10)

- [x] **7.1 Feed from the database** (§4) (2026-11-06, feature/real-feed)
  Replace the spike's hard-coded IDs with `feed_item`. Put the player at the top of the page, with the channel name and title in a strip below it. Videos loop. No tap-to-pause and no counter (decided 2026-11-06).
  *Result:* works on the phone. `hooks/useFeed.ts` reads the list and opens on the first unwatched video (`lib/feedPages.ts`). `lib/feedPaging.ts` splits each page into the player and an info strip of at least 84 dp plus the navigation bar inset. Videos loop by seeking to 0 when they end. Nothing plays while Sources or Status is open. `lib/spikeShorts.ts` is removed.
  - The first version created a new player (WebView) for each page near the current one, like the spike. After about 10 players, new ones never loaded: the logs showed `mounted`, then nothing (no `ready`, no page load, no crash). The spike had the same design but was only tested for 12 switches.
  - The fix: the feed is now a paging `ScrollView` (spec §3, §10) with exactly 3 players (`components/PlayerSlot.tsx`) that sit over the current page and its neighbors. Page p always gets player p % 3 (`lib/playerSlots.ts`), so a swipe moves one player, which cues its new video in the same WebView. In a run of 32 switches, only 3 players were ever created, none stalled, and looping worked.
- [x] **7.2 Empty and end states** (§4) (2026-11-06, feature/real-feed)
  An empty screen with a "Refresh" button when there's no list, and "That's it for today" at the end of the list.
  *Result:* the end page works on the phone. The empty screen wasn't tested on the phone, because a list was already saved.
- [x] **7.3 Auto-skip** (F8) (2026-11-06, feature/auto-skip)
  When the player reports an error, skip the video and replace it from the reserve. A slow video is not skipped (decided 2026-11-06).
  *Result:* works on the phone. A temporary test gave video 2 an ID that doesn't exist. Its player, still a neighbor of video 1, reported `embed_not_allowed` (not `video_not_found`, as you might expect), and the first reserve video took its place before the user swiped to it. `lib/autoSkip.ts` skips on `video_not_found`, `embed_not_allowed` and `invalid_parameter`, but not on `HTML5_error`, which a weak connection can cause. The skipped video and its replacement swap positions and reserve flags (`skipFeedItem` in `db/feed.ts`, in one transaction), and the skipped one is marked `skipped`. The feed stays on the same page. With no reserve left, the video just leaves the list. That the skip survives an app restart is covered by the `db/` tests, not checked on the phone.
- [x] **7.4 Mark as watched** (F9) (2026-11-06, feature/watched-preload)
  Save to `watched` once half the video has played. Watched videos don't come back in later fetches.
  *Result:* the user checked it on the phone and it works. `PlayerSlot` now reports every player state. `hooks/useWatchProgress.ts` counts each video's play time (`lib/watchProgress.ts`): pauses, buffering and time with the app in the background don't count, and coming back to a video adds to its earlier time. When the playing video reaches half its length, `recordWatched` (`db/watched.ts`) saves it to `watched` and sets its `feed_item` to `watched` in one transaction, and a `[watched] <id>: 30.0 s of 60 s played` line is logged. The fetch already leaves watched videos out (`getWatchedIds` in `useRefresh`).
- [x] **7.5 Preload the next video** (F10, nice to have) (2026-11-06, feature/watched-preload)
  *Result:* the user checked it on the phone and it works. The neighbors were already cued in their players (7.1). Now `FeedPager` picks the new page from the snap's first movement after the finger lifts (`snapTargetIndex` in `lib/feedPaging.ts`), so the video starts while the page slides in, instead of after the ~0.26 s snap. `onMomentumScrollEnd` still corrects a wrong pick. The `[switch]` line now shows "page picked after X ms" instead of the snap time; it should be close to 0.
- [x] **7.6 Re-measure on the phone** (§8) (2026-11-06, feature/watched-preload)
  Switch time again (target: under 1 s in 80% of cases), and opening the app with an existing list (target: under 2 s).
  *Test plan:* run `npx expo start --no-dev --minify` (still Expo Go, but closer to real use than dev mode).
  1. Switching: about 30 swipes, both directions, at a normal pace. Read the last `[switch] … switches: …` summary line. Check that "page picked after" stays small, and that a short drag that snaps back doesn't change the video.
  2. Watched: let one video play past half its length. A `[watched]` line should appear. Close Expo Go and reopen: the feed should open on the first video not yet watched, so not on that one.
  3. Opening: close Expo Go fully and reopen it 3 times with a list saved. Read the `[open] … ms` line each time.
  4. Also check that the video loops and that Sources and Status still pause it.

  *Result:* the user ran the checks on the phone and reported all good. The `[switch]` and `[open]` numbers weren't recorded here; add them to the table below if they're available, otherwise take them in 10.1.

## Phase 8 – Status screen (F11, nice to have)

- [x] **8.1 Status screen** (§4) (2026-11-06, feature/status-screen)
  Shows the last fetch time, videos fetched, rejections per rule and API units used, read from `fetch_log`.
  *Result:* works on the phone. Before a Refresh, Status showed the 13:06 fetch "48 min ago". After it, it showed "Today 13:55 (just now)" with 75 fetched, 35 passed, 40 rejected (all by length) and 4 units, the same as the `[fetch]` lines. The first row was renamed from "Last fetch" to "Time", because the section heading already says "Last fetch". `hooks/useStatus.ts` reads the latest `fetch_log` row once when the screen opens. Refresh runs on the Feed, and Status is closed then, so the log can't change while it's open. `buildStatusReport` in `lib/statusReport.ts` turns the row into the time (local, e.g. "Today 14:32 (5 min ago)"), videos fetched, passed, rejected and units used, plus the count for every rule in the §5 order. Rules that rejected nothing are shown muted. `fetch_log.error` is shown under "Problems" when there is one. The API key line from 0.3 stays. `components/StatusRows.tsx` draws the label and value rows, which follow the phone's layout direction.

## Phase 9 – Visual polish (§11)

- [ ] **9.1 Decorative art**
  Sakura, clouds and mountains on the empty and end screens only, never over the player. Calm fades.
- [ ] **9.2 App icon and splash screen**
- [ ] **9.3 Hebrew and English check**
  Hebrew titles and channel names align correctly in the overlays and on the Sources screen.

## Phase 10 – POC wrap-up

- [ ] **10.1 Final measurements and answers**
  Re-run every §8 target on the phone, then answer the four questions in spec §1 under "POC results" below.

---

## Open questions (decide before the step that needs the answer)

- **Mood reference image (9.x):** spec §11 points to `assets/reference/mood.jpg`, which isn't in the repo yet.

Decided on 2026-11-06:
- **Feed behavior (Phase 7):** no tap-to-pause, because the YouTube player's own controls already pause and resume, and catching taps would mean covering the player. No "4 of 15" counter. The player sits at the top of the page, with the channel name and title in a strip below it. Videos loop when they end. Auto-skip (F8) happens only on a player error; a slow video is left for the user to skip, since the cause may be weak reception. On opening, the feed starts at the first video not yet watched or skipped. After a Refresh, it starts at video 1. Spec §4, §6, §9 and §11 are updated.
- **Preloading (7.5):** no hidden or muted playback of neighbor videos, to stay within YouTube's policies. Only start playback when the finger lifts.
- **Fetch failures (6.1):** a key or quota error stops the fetch. Any other error on one channel's uploads skips only that channel, and `fetch_log.error` names it. A failed fetch, or one where no video passes, keeps the current list. "New since the previous fetch" counts from the start of the last fetch with `fetched > 0`. Spec §5 and §7 are updated.
- **Refresh button before 7.1 (6.2):** Sunset, in the Feed header next to Sources and Status. The result shows in an alert. The feed keeps playing the spike Shorts until 7.1 reads `feed_item`.
- **Swipe to remove (5.3):** built on React Native's own `PanResponder` and `Animated`, so no gesture library is added. Swiping a row uncovers a Sunset "Remove" button, and tapping it removes the channel, so a stray swipe can't remove one. Spec §4 is updated.
- **Topics when adding (5.2):** picked with two topic tags in the add form. Add stays disabled until at least one is picked, and the picked topics stay for the next channel. On a saved channel, tapping a tag toggles that topic, but the last topic can't be removed (F3). Spec §4 is updated.
- **What `fetch_log.rejectedByRule` stores (3.1):** a JSON list with one `{videoId, rule, detail}` per rejected video, as text in the SQLite row (not a separate file). The Status screen (8.1) counts them per rule. Logs older than 30 days are deleted when a new fetch is saved. Spec §7 is updated.
- **Channel name in `feed_item` (3.1):** `feed_item.channelTitle` is saved with each video, so the overlay (7.1) still has the name after the channel is removed (F2). Spec §7 is updated.
- **Live stream detection (2.4, 4.1):** `videos.list` also requests `snippet` and `liveStreamingDetails` (no extra units). Live, upcoming and ended streams are rejected. Spec §5 is updated.
- **Keyword exemption (2.4):** a channel assigned to exactly one topic skips the keyword rule, as the spec says. With World War II and Claude Code as the topics, few channels will have both, so the keyword rule will rarely run.
- **Keywords and blocked words (2.3):** the lists are in `lib/topics.ts`. The second topic is now Claude Code instead of Quantum Computing (spec §2, §9).

## POC results

*Fill in during steps 1.2, 7.6 and 10.1.*

| Measure | Target | Result |
| --- | --- | --- |
| Video switch time | < 1 s in 80% of switches | Step 1.2: 8% under 1 s (1 of 12), median 1.13 s. Not met, but the user found it good in use. Step 7.1 (3 reused players): 41% under 1 s (13 of 32), median 1.10 s, slowest 5.9 s (one outlier). New videos took about 1.0–1.5 s, videos already played about 0.55 s. Not met. Step 8.1 session (dev mode, only 4 switches): 3 of 4 under 1 s, median 964 ms, slowest 1.25 s, page picked after 16–25 ms. Re-measure with ~30 switches in 10.1. |
| App open with an existing list | < 2 s | Step 7.3 test: 3.2 s (also after a fresh bundle). Step 7.1: one measurement, 2.6 s from the app's JavaScript starting to the first video playing (reading the list took 25 ms). Taken right after a fresh bundle in dev mode. Step 7.6: the user found it good on the phone; numbers not recorded. Step 8.1 session (dev mode): 2.8 s (reading the list took 27 ms). Re-measure in 10.1. |
| Fetch duration | < 60 s | Step 6.2: 1.3 s and 0.8 s with 2 channels (100 uploads). Met, re-measure with the full channel list in 10.1. |
| Fetch quota | < 100 units | Step 6.2: 4 units with 2 channels. About 60 expected for 30 channels. Met. |

| Question (spec §1) | Answer |
| --- | --- |
| 1. Can Shorts be reliably identified? | |
| 2. Do the channel list and filters give a relevant feed? | |
| 3. Can the official player switch videos in under 1 s? | |
| 4. Is Expo enough, with no Android-specific code? | |
