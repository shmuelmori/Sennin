# Sennin – Build Status

The POC build plan, split into steps. The spec (`docs/Sennin – POC Specification.md`) is the source of truth. This file only tracks order and progress.

## How to use this file

- At the start of a session, pick the next unchecked steps that fit in one session. Small steps can share a session, and a large step can be split across several.
- When a step is merged into `main`, change `[ ]` to `[x]` and add the date and branch, e.g. `[x] **2.1 …** (2026-11-10, feature/duration-parser)`.
- A step counts as done only when the "Before calling a task done" checks in `CLAUDE.md` pass (typecheck, lint, `lib/` tests, and a phone test for anything touching the feed or player).
- If a step changes a decision, update the spec in the same branch.
- Steps that need a new dependency are marked **(dep)**. Ask the user before installing it.

**Next step:** 0.3

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
- [ ] **0.3 API key setup**
  Add `.env.example` with `EXPO_PUBLIC_YOUTUBE_KEY=`. Confirm `.env` is git-ignored. Restrict the key to the YouTube Data API in Google Cloud (manual step for the user).
  *Done when:* the app can read the key at runtime and `.env` doesn't show up in `git status`.
- [ ] **0.4 Theme and navigation skeleton** (§4, §11)
  Put the palette and spacing in `theme/`. Add three empty screens (Feed, Sources, Status) with navigation between them.
  *Done when:* all three screens open on the phone in the §11 colors, with no hex literals outside `theme/`.

## Phase 1 – Player spike (do the riskiest part first)

The spec (§10) calls the player the highest risk: "test in the first week". This phase answers POC question 3 before any other feature is built.

- [ ] **1.1 Paging feed with hard-coded Shorts** (§3, §4, F7)
  A vertical `FlatList` with `pagingEnabled` and ~15 hard-coded Short IDs, playing through `react-native-youtube-iframe`. Mount a player only for the current item and its neighbors.
  *Done when:* swiping up and down works on the phone, and the YouTube branding and controls are fully visible.
- [ ] **1.2 Measure switch time** (§8)
  Log the time from swipe end to playback start. Run about 30 switches on the phone.
  *Done when:* the results are recorded under "POC results" below. If fewer than 80% are under 1 s, try fixes (neighbor preloading, a lighter WebView setup) before going on.

## Phase 2 – Pure logic in `lib/` (each with unit tests)

- [ ] **2.1 ISO 8601 duration parser**
  `PT1M5S` → 65. Handles hours, missing parts and bad input.
- [ ] **2.2 Channel input parser** (F1)
  Accepts `@handle`, `youtube.com/@handle`, `youtube.com/channel/UC…`, and mobile links. Returns a handle, a channelId or an "invalid" reason.
- [ ] **2.3 Topic and word constants** (§2, §5)
  The 2 topics with their keywords, plus the blocked-words list.
- [ ] **2.4 Filter rules** (§5, F5)
  One function per rule, each returning pass or a rejection reason: length ≤ 90 s, vertical (height > width), embeddable, keyword (single-topic channels exempt), blocked words, minimum 1,000 views (skipped for videos from the last 48 h), live stream. Plus a runner that applies all rules and collects the rejections.
- [ ] **2.5 Dedupe, sort and select** (§5 steps 2, 5, 6)
  Remove watched videos and videos already in the list. Sort new-since-last-fetch first, then by views. Return 15 feed videos plus up to 10 in reserve, and fill with older unwatched videos if there aren't enough new ones (§10).

## Phase 3 – Storage in `db/`

- [ ] **3.1 Schema and seed** (§7)
  Create all six tables on first launch and seed the 2 topics.
  *Done when:* the app starts on the phone and the tables exist.
- [ ] **3.2 Queries**
  Channels (add, remove, list, set topics), feed items (replace the list, read, update status), watched (insert, check), fetch log (insert, read latest). Removing a channel must not delete its feed items (F2).

## Phase 4 – YouTube client in `services/youtube.ts`

- [ ] **4.1 Typed API client with a quota counter**
  `channels.list` (`forHandle=` or `id=`), `playlistItems.list` (up to 50), `videos.list` (batches of 50, with `maxHeight` so `player.embedWidth` and `embedHeight` are returned). Count units for every call. Handle errors: bad key, quota exceeded, network.
  *Done when:* resolving one real channel and fetching its videos works on the phone, and the unit count is correct.

## Phase 5 – Sources screen (F1, F2, F3)

- [ ] **5.1 Channel list** (§4)
  A `useChannels` hook, plus a list showing each channel's thumbnail, name and topic tags.
- [ ] **5.2 Add a channel** (F1)
  Paste a link or @handle, resolve it through the API, save it. Show a clear error for invalid or unknown input.
- [ ] **5.3 Remove and assign topics** (F2, F3) (dep: swipe gesture library, if needed)
  Swipe to remove. Assign each channel to one topic or both.
  *Done when:* adding, removing and assigning all work on the phone, and the data survives an app restart.

## Phase 6 – Fetch pipeline (F4, F5, F6)

- [ ] **6.1 Refresh hook**
  Runs the full §5 process: playlist items per channel → dedupe → `videos.list` → filter → sort → save 15 + reserve → write `fetch_log` (each rejected video with its rule, plus quota used).
- [ ] **6.2 Run it for real**
  Wire the "Refresh" button with loading and error states. Test with real channels.
  *Done when:* one fetch takes under 60 s and under 100 units (§8), and `fetch_log` shows the rejections.

## Phase 7 – Real feed (F7, F8, F9, F10)

- [ ] **7.1 Feed from the database** (§4)
  Replace the spike's hard-coded IDs with `feed_item`. Add overlays (channel name, title, "4 of 15") at the bottom without covering player controls. Tap to pause and resume.
- [ ] **7.2 Empty and end states** (§4)
  An empty screen with a "Refresh" button when there's no list, and "That's it for today" at the end of the list.
- [ ] **7.3 Auto-skip** (F8)
  If a video hasn't loaded within 3 s, skip it and replace it from the reserve.
- [ ] **7.4 Mark as watched** (F9)
  Save to `watched` once half the video has played. Watched videos don't come back in later fetches.
- [ ] **7.5 Preload the next video** (F10, nice to have)
- [ ] **7.6 Re-measure on the phone** (§8)
  Switch time again (target: under 1 s in 80% of cases), and opening the app with an existing list (target: under 2 s).

## Phase 8 – Status screen (F11, nice to have)

- [ ] **8.1 Status screen** (§4)
  Shows the last fetch time, videos fetched, rejections per rule and API units used, read from `fetch_log`.

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

- **Live stream detection (2.4, 4.1):** the parts listed in spec §5 (`contentDetails, statistics, status, player`) don't say whether a video is live. That needs `snippet.liveBroadcastContent` or `liveStreamingDetails`. Adding a part to `videos.list` costs no extra units. Update spec §5 once decided.
- **What `fetch_log.rejectedByRule` stores (3.1):** `CLAUDE.md` asks for each rejected video with its rule. Decide whether to store a JSON list of `{videoId, rule}` or only counts per rule.
- **Keyword exemption (2.4):** assumed to mean "channel assigned to exactly one topic". Confirm.
- **Keywords and blocked words (2.3):** the spec gives only examples. The full lists are needed.
- **Mood reference image (9.x):** spec §11 points to `assets/reference/mood.jpg`, which isn't in the repo yet.

## POC results

*Fill in during steps 1.2, 7.6 and 10.1.*

| Measure | Target | Result |
| --- | --- | --- |
| Video switch time | < 1 s in 80% of switches | |
| App open with an existing list | < 2 s | |
| Fetch duration | < 60 s | |
| Fetch quota | < 100 units | |

| Question (spec §1) | Answer |
| --- | --- |
| 1. Can Shorts be reliably identified? | |
| 2. Do the channel list and filters give a relevant feed? | |
| 3. Can the official player switch videos in under 1 s? | |
| 4. Is Expo enough, with no Android-specific code? | |
