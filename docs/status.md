# Sennin – Build Status: UI redesign (bottom navigation)

The plan for moving the app from a stack with header buttons to five tabs with a bottom navigation bar. The spec (`docs/Sennin – POC Specification.md`) is the source of truth. This file only tracks order and progress. The earlier POC build plan (Phases 0–10, decisions, POC results) is in the git history of this file, up to merge commit `a1abbf9`.

## How to use this file

- Work one stage at a time, in order. Don't start a stage before the user approves it.
- When a stage is merged into `main`, change its `[ ]` items to `[x]` and add the date and branch to the stage heading, e.g. `## Stage 1 – Tab shell (2026-11-08, feature/tab-navigation)`.
- A stage counts as done only when the "Before calling a task done" checks in `CLAUDE.md` pass (typecheck, lint, `lib/` tests, and a phone test for anything touching the feed or player), and its acceptance criteria are checked on the Galaxy S24 FE.
- This is a UI restructure. The fetch pipeline, filter rules, SQLite queries, watched history, auto-skip and preloading keep working as they are. The one logic change is the `fetch_log.finishedAt` column (Stage 4).
- If a stage changes a decision, update the spec in the same branch. Spec §4 (Navigation, Feed, Sources, Refresh, Home), §7 (`fetch_log`) and §11 (info strip position) change in this redesign, and so does the "UI" section of `CLAUDE.md`.
- Steps that need a new dependency are marked **(dep)**. Ask the user before installing it.

**Next stage:** 2 (Home screen)

---

## Stage 1 – Tab navigation shell (2026-11-07, feature/tab-navigation)

**Goal:** every screen shows a bottom bar with 5 buttons, the active one highlighted in Sunset. The existing screens keep working inside it.

- [x] Root `app/_layout.tsx` renders `Tabs` from `expo-router` (no native code), inside `ThemeProvider`, `DatabaseProvider` and `FeedListSignalProvider`. No `(tabs)` group was needed: all five routes sit directly in `app/`.
- [x] Five routes, in bar order: Feed (`app/feed.tsx`, moved from `index.tsx`), Status, Sources, Refresh (`app/refresh.tsx`), Home (`app/index.tsx`). The app opens on Home because it is `/`. Android's Back goes to the previously opened tab (`backBehavior="history"`).
- [x] Tab bar: Deep Sea Night background, Teal Mist top border, active tab Sunset, others Silver, 12 pt English label under each icon. Colors come from `theme/`.
- [x] Icons: `@expo/vector-icons` 15.0.2 **(dep, approved)**, Ionicons, outline when closed and filled when open (`components/TabIcon.tsx`): play-circle, stats-chart, albums, refresh-circle, home.
- [x] Headers removed on all screens. Each screen pads for the status bar with `SafeAreaView` (`edges={['top']}`). `components/HeaderButton.tsx` is removed.
- [x] Tabs switch with a fade.
- [x] The Feed pauses when another tab is open: `useIsFocused` still turns the pager's `active` off, since the Feed stays mounted.
- [x] Feed page height is measured by `onLayout` between the status bar and the tab bar. The info strip no longer adds `insets.bottom` (the tab bar keeps clear of Android's navigation bar), so `FeedPager` gets `bottomInset={0}`. Stage 3 removes the prop.
- [x] Pulled forward from Stage 4, because removing the headers removed the Feed's Refresh button: an interim Refresh tab with the old button and alert. `hooks/FeedListSignal.tsx` (a counter in context, no state library) lets `useRefresh` announce a saved list, and `useFeed` reads it again. The empty Feed's button is now "Open Refresh" and switches tabs. `useStatus` re-reads `fetch_log` each time the Status tab opens (`useFocusEffect`).
- [x] Home is a placeholder ("Sennin") until Stage 2.
- [x] Spec §4 "Navigation" and the Feed's Refresh lines updated.

*Result:* the user checked it on the phone and reported all good.

**Acceptance (on the phone):**
- The app opens on Home. All 5 buttons show on every screen, in the order Feed, Status, Sources, Refresh, Home (on this right-to-left phone, Feed is on the right). Tapping one opens its screen, and only that button is Sunset with a filled icon.
- The bottom bar sits above Android's navigation bar, not under it. No screen's content is under the status bar.
- The Feed pages one video per swipe with no half pages, and the player's bottom edge is fully visible above the tab bar.
- Open a video, switch to another tab: the sound stops. Switch back: the same video is shown and can be resumed.
- Refresh tab: tap Refresh, the alert shows the result. Then open Feed: it starts at video 1 of the new list. Open Status: it shows that fetch.
- Sources: add, remove (swipe) and topic toggles work as before.
- Android Back from a tab returns to the tab opened before it, and from Home closes the app.

## Stage 2 – Home screen

**Goal:** Home shows the Sennin image and nothing else.

- [ ] Add `assets/images/sennin.jpeg` (864x1200, 450 KB) to git. It's untracked right now.
- [ ] `app/index.tsx` shows the whole image (`contain`) centered on Deep Sea Night, above the tab bar, without cropping.
- [ ] Fade the image in once it has loaded, like `DuskBackdrop` (reuse it with an image prop if that stays simple).
- [ ] Spec §4: add a Home section.

**Acceptance (on the phone):**
- Home shows the Sennin image, whole and not stretched, with no text and nothing else but the tab bar.
- The image fades in, with no white flash.

## Stage 3 – Feed screen changes

**Goal:** the channel name and title move to a strip at the top, above the player. No counter.

- [ ] `lib/feedPaging.ts`: split the page into the info strip on top and the player below it (largest 9:16 that fits), plus tests. The strip never overlaps the player.
- [ ] `ShortInfo` moves to the top strip: channel name (Cherry Blossom) and title (Silver), each in its own text direction (`lib/textDirection.ts`). Remove its `bottomInset` prop and the one in `FeedPager` and `ShortPage`.
- [ ] Keep the 3 reused players (`PlayerSlot`, `lib/playerSlots.ts`) and the paging `ScrollView`; only the page split changes.
- [ ] Update spec §4 "Feed", §11 (the strip is above the player) and the "UI" section of `CLAUDE.md` ("The channel name and title sit in a strip below the player").

**Acceptance (on the phone):**
- Each swipe moves exactly one video, in both directions, with no half pages and no drift after 15 swipes.
- The strip is above the player and never covers YouTube's title, logo, controls or ads.
- Hebrew and English titles each start on their own side. Two-line titles end in "…".
- About 20 switches: the `[switch]` timings stay about the same as before (median close to 1 s).

## Stage 4 – Refresh screen

**Goal:** the Refresh tab gets a large central Sunset button, a loading state, and a report of the fetch.

- [ ] A large rounded Sunset button in the middle, with a bold Deep Sea Night label. While fetching: disabled, with an `ActivityIndicator` and a "Fetching…" label, and a second tap does nothing.
- [ ] The report under the button: videos fetched, passed, rejected per rule (all rules in §5 order), API units used, duration, and any error. Reuse `buildStatusReport` (`lib/statusReport.ts`) and `StatusRows`. It replaces the interim alert, and shows the last fetch from `fetch_log` when the tab opens (or "No fetch yet").
- [ ] `fetch_log.finishedAt`: a schema migration (next `PRAGMA user_version`) adds the column, nullable for old rows. `useRefresh` saves it, and the report shows the duration, or "—" for rows from before the migration. Add it to Status too, so both screens show the same report. `db/` and `lib/` tests updated.
- [ ] Update spec §4 (Refresh section) and §7 (`fetch_log.finishedAt`).

**Acceptance (on the phone):**
- Tap Refresh: the button shows it is working, and the report appears when the fetch ends (under 60 s, under 100 units).
- The report's numbers, including the duration, match the `[fetch]` lines in the Expo terminal.
- With no network (airplane mode): an error is shown and the old list stays.
- Switch tabs during a fetch and come back: the fetch finishes and the report shows.
- Close and reopen the app: Refresh and Status still show the last fetch with its duration.

## Stage 5 – Sources styling

**Goal:** each channel is a rounded card with a filled, rounded trash button.

- [ ] `ChannelRow` becomes a card: `radius.md` corners, a 1 dp Teal Mist outline on Deep Sea Night (no new color), `spacing.sm` between cards instead of dividers.
- [ ] A filled, round trash button on each card: Sunset fill, Deep Sea Night Ionicons `trash` icon, 44 dp. Tapping it asks "Remove <channel>?" (Remove / Cancel) before removing.
- [ ] The button replaces swipe-to-remove: remove `components/SwipeToRemove.tsx`, `lib/swipe.ts` and its tests, and update the hint text. Update spec §4 "Sources".
- [ ] Thumbnail, name (own text direction), topic tags and the add form keep working as before.

**Acceptance (on the phone):**
- Each channel shows as a separate rounded card. The trash button is easy to hit and doesn't trigger a topic tag.
- Remove asks first. Cancel keeps the channel; Remove removes it, and that survives an app restart. Its videos stay in the current feed (F2).
- Adding a channel and toggling topics work as before. Hebrew names start on the right.

## Stage 6 – Regression check on the phone

**Goal:** the whole app works end to end with the new layout.

- [ ] Status screen content unchanged apart from the duration row: last fetch, rejections per rule, units, error, API key line.
- [ ] Full flow: open the app → Home → Sources (add a channel) → Refresh → Feed (swipe through, watch one past half) → Status.
- [ ] Watched: a video played past half doesn't come back after the next Refresh.
- [ ] Auto-skip, looping and preloading still work.
- [ ] Typecheck, lint and all tests pass.

**Acceptance (on the phone):**
- Every step of the full flow works with no crash, no blank screen and no sound from a hidden tab.
- No hex literals outside `theme/`, and no decorative art over the player.

## Stage 7 – Final measurements (old step 10.1)

**Goal:** re-run every spec §8 target on the new layout (the tab bar changes the page size and the open flow), then answer the four questions in spec §1.

- [ ] Run `npx expo start --no-dev --minify`.
- [ ] Switching: about 30 swipes, both directions. Record the share under 1 s and the median from the last `[switch]` summary line.
- [ ] Opening: close Expo Go fully and reopen 3 times with a list saved. The app now opens on Home, so measure from opening the Feed tab to the first video playing, and also note the `[open]` line.
- [ ] Fetch: duration and units with the full channel list.
- [ ] Write the results and the four answers in a "POC results" section at the end of this file (the earlier numbers are in git history).

---

## Decisions (2026-11-07)

From the user:
- **Tab order:** Feed, Status, Sources, Refresh, Home. The app opens on Home.
- **Icons:** `@expo/vector-icons` (Ionicons), approved as a dependency.
- **Labels:** an icon with a short English label under it.
- **Headers:** none on any screen.
- **Counter:** no "4 of 15" counter; the 2026-11-06 decision stands. The top strip shows the channel name and title only.
- **Fetch duration:** saved as `fetch_log.finishedAt` (a small migration) and shown as a duration.
- **Final measurements:** run step 10.1 after the redesign, as Stage 7.
- **Branches:** `chore/poc-wrap-up` merged into `main` (`a1abbf9`, not pushed). The redesign is on `feature/tab-navigation` (CLAUDE.md's `feature/` prefix).

Best judgement, for the user to overrule:
- **Back button:** Android's Back goes to the previously opened tab, then closes the app from the first one (`backBehavior="history"`).
- **Tab switch:** a fade, matching the calm-motion rule.
- **Interim Refresh in Stage 1:** removing the headers would have left no way to refresh, so the old button and alert moved to the Refresh tab early. Stage 4 replaces them.
- **Sennin image:** `contain`, so the whole picture shows, with Deep Sea Night around it.
- **Empty Feed:** an "Open Refresh" button that switches to the Refresh tab.
- **Delete on Sources:** the trash button replaces the swipe, and asks for confirmation, so a stray tap can't remove a channel.
- **Card look:** a Teal Mist outline, so the palette doesn't gain a new color.

## Open questions

None right now.
