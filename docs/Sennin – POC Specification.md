# Sennin – POC Specification

Nov 4, 2026 · @shmuel · Updated Nov 8, 2026: topic-based feed (replaces channel sources) · Updated Nov 10, 2026: video info sheet (Gemini)

**Project:** Sennin · **Document type:** POC specification · **Platform:** Android

## 1. Goal

Prove that, at the tap of a button, you can get a varied feed of educational Shorts and scroll between them smoothly inside an Android app. No server and no cost.

Each fetch draws 20 topics ("items") from a long, dynamic list and searches YouTube for 5 English Shorts per item, so the feed holds up to 100 videos and doesn't depend on channels found in advance. Decided on 2026-11-08, replacing the hand-picked channel list.

Questions the POC answers:

1. Can Shorts be reliably identified through the YouTube Data API?
2. Do a topic search and simple filter rules produce a relevant feed?
3. Does YouTube's official player allow switching between videos in under one second?
4. Is React Native with Expo enough, without any Android-specific code?

## 2. Scope

| Area | In scope |
| --- | --- |
| Platform | Android, single device (Galaxy S24 FE), not distributed via the store |
| Items | Hundreds of topics in one flat list in SQLite, seeded on first launch; the user can add, remove, restore and delete items |
| Source | YouTube search (`search.list`) per drawn item |
| Fetching | Manual only, via a "Refresh" button |
| Filtering | Fixed rules (section 5) |
| Feed | Up to 100 videos (20 items × 5) plus a reserve, full screen, vertical scrolling, official YouTube player |
| History | Logging watched videos to prevent repeats |

**Concepts**

- **Item:** one topic in the list. It can be specific ("octopus", "iron", "Claude Code") or broad ("sea creatures"). The item is the unit that is drawn, searched and removed. Each item has an ID, a name and an English search query.
- **No hierarchy:** there are no topics and subtopics, neither in the UI nor in the DB. All items are equal and live in one flat list.
- **Removed item:** an item marked for removal. It is not drawn and can be restored.

**Out of scope:** a hierarchy of topics and subtopics; editing the name or query of an existing item; automatic background fetching; search languages other than English.

## 3. Tech stack

| Layer | Choice |
| --- | --- |
| Language and UI | TypeScript + React Native |
| Framework | Expo (development in VS Code, running via Expo Go) |
| Navigation | Expo Router |
| Feed | Vertical ScrollView with pagingEnabled, with 3 players reused across pages (changed from FlatList on 2026-11-06, see §10) |
| Player | react-native-youtube-iframe (official IFrame inside react-native-webview) |
| Network | fetch against YouTube Data API v3 |
| Storage | expo-sqlite |
| API key | .env file (EXPO\_PUBLIC\_YOUTUBE\_KEY), restricted to YouTube Data API only |
| Video info | Gemini API (`generateContent` with the `google_search` tool), key in .env (EXPO\_PUBLIC\_GEMINI\_KEY). The model name is set once, in `config/gemini.ts` (`gemini-2.5-flash`). Added 2026-11-10 |
| Bottom sheet | @gorhom/bottom-sheet (with react-native-reanimated and react-native-gesture-handler, all in Expo Go) |

## 4. Screens

**Navigation:** five tabs with a bottom bar on every screen, in this order: Feed, Status, Topics, Refresh, Home. The app opens on Home. Each tab button has an icon (`@expo/vector-icons`, Ionicons) and a short English label; the open tab's button is Sunset, the others Silver. No screen has a header, so the Feed gets the full height between the status bar and the tab bar. Tabs switch with a fade, and Android's Back goes to the previously opened tab. Only the Feed plays video, and it pauses while another tab is open. Decided on 2026-11-07, replacing the earlier stack with header buttons. Topics replaced Sources on 2026-11-08.

**Feed**

- The item name (e.g. "Octopus") and, under it, the video title in a strip at the top of the page, and the video below it (the largest 9:16 size that fits, down to the tab bar). The strip ends where the player starts, so nothing covers the player. The channel name is no longer shown (2026-11-08). The strip moved from below the player on 2026-11-08.
- A small remove button at the side of the strip. Tapping it marks the video's item as removed and shows a message with "Undo" for 5 seconds, over the strip (never over the player). The removal applies from the next fetch: videos of that item already in today's feed stay, without the button.
- Order: videos are shuffled so that two videos of the same item never appear in a row.
- Swipe up: next video. Swipe down: previous video.
- Pause and resume use the YouTube player's own controls. The app adds no tap handling of its own, because catching taps would mean covering the player.
- A video loops when it ends, like in the Shorts app.
- No "4 of 100" counter.
- No Refresh button on the Feed: Refresh is its own tab (decided 2026-11-07). A list saved there opens at its first video the next time the Feed is shown. Opening the app shows the saved list without fetching.
- No list yet: empty screen with an "Open Refresh" button that switches to the Refresh tab. End of list: "That's it for today".
- Pause, counter and loop decided on 2026-11-06.

**Home**

- The screen the app opens on. It shows the Sennin image (`assets/images/sennin.jpeg`) whole (`contain`, never cropped or stretched), centered on Deep Sea Night above the tab bar, with no text.
- The image fades in once it has loaded, like the dusk scene, so there is no white flash. Decided on 2026-11-07.

**Topics** (replaces Sources, 2026-11-08)

- One flat list of all items, both seeded and user-added, sorted alphabetically.
- A removed item is shown in grey with a "Restore" button.
- At the top: a search bar that filters the list, and an "active of total" counter.
- Add: a + button at the right end of the header opens a text box with an "Add" button. Several items can be entered separated by commas, e.g. "black holes, volcanoes, octopus". Input is trimmed, empty values are ignored, and duplicates are skipped case-insensitively. A new item's search query is the text that was typed. A short message says how many were added and how many were skipped as duplicates.
- Delete: any item, whatever its origin, can be deleted completely with a swipe, after confirmation. The swipe uncovers a Sunset "Delete" button at the row's end (React Native's PanResponder, no gesture library).
- An active item has no remove button here: items are removed from the Feed, and restored here (2026-11-08).

**Refresh**

- A large rounded Sunset button in the middle of the screen, with a bold Deep Sea Night label (F4). While a fetch runs, it is disabled and shows a spinner and "Fetching…"; a second tap does nothing.
- If fewer than 2,100 quota units are left today, the button is disabled and a message says why.
- Under it: the result of the last tap (e.g. "New list ready", or why the list stayed), then the last fetch's report from `fetch_log`, the same one Status shows. When the tab opens it shows the last fetch, or "No fetch yet".
- A fetch keeps running if another tab is opened, and its report shows when you come back. Decided on 2026-11-08, replacing the alert that followed a Refresh.

**Status**

- Time of the last fetch and how long it took.
- The items drawn, and for each item: how many results, how many passed and how many were selected. Items that returned 0 videos are flagged.
- How many videos were rejected and by which rule. Every rule is listed in the §5 order, including rules that rejected nothing.
- API units used by the fetch, and units left today.
- The fetch's error is shown when there is one, and so is whether the API key is loaded.
- Gemini requests sent today (Pacific Time day), and whether the Gemini key is loaded (2026-11-10).

## 5. Fetch process

**1. Draw items**

- Draw 20 distinct items from the active (not removed) items. If fewer than 20 are active, take all of them.
- The draw is weighted: an item never drawn has weight 30. Any other item's weight is the number of days since it was last drawn, up to 30. An item drawn today has weight 0.

**2. Search per item:** one `search.list` call per item, 5 at a time. A key or `quotaExceeded` error stops the searches not yet sent.

| Parameter | Value |
| --- | --- |
| q | The item's query plus a suffix |
| type | video |
| videoDuration | short |
| relevanceLanguage | en |
| safeSearch | moderate |
| maxResults | 25 |
| order | Rotates by pickCount: relevance, viewCount, date |

The suffix rotates by pickCount: explained, facts, how, why. Rotating the suffix and order makes an item that is drawn again return different videos.

**3. Remove** videos that were already watched, are already in the list, or appear in the results of more than one item.

**4. videos.list** (snippet, contentDetails, statistics, status, player, liveStreamingDetails) in batches of 50. Extra parts cost no extra units. `snippet` gives the title, description, tags, publish date and live state.

**5. Filter** by the rules, logging the rejection reason for each video.

| Rule | Value |
| --- | --- |
| Live stream | Rejected: `snippet.liveBroadcastContent` is live or upcoming, or `liveStreamingDetails` is present (streams that have ended) |
| Length | Up to 3 minutes (180 seconds) |
| Vertical | Height greater than width |
| Embeddable | status.embeddable = true |
| Blocked words | e.g. "reacts to", "reaction video", giveaway, #meme (not plain "reaction", which also blocks "chain reaction") |
| Minimum views | 1,000 (does not apply to videos from the last 48 hours) |
| Query match | A word from the item's query appears in the title, description or tags, as a whole word, ignoring case. A plural also matches its simple singular ("holes" → "hole"), and common words ("the", "of", "how") are ignored. Replaces the topic keyword rule (2026-11-08) |

The rules run in this order: live stream, length, vertical, embeddable, blocked words, minimum views, query match. Each rejected video is logged with the first rule that rejects it, so the counts per rule add up to the number of rejected videos.

**6. Select**

- For each item: up to 5 videos that passed, sorted by view count. An item with fewer than 5 keeps what it has and is not replaced by another item.
- Videos that passed but weren't selected go to the reserve, up to 20 in total.
- Shuffle the selected videos so no two of the same item are adjacent (§4 Feed).
- Update `lastPickedAt` and `pickCount` of every drawn item, once the new list is saved. A fetch that keeps the current list leaves them as they were.

**Quota** (decided on 2026-11-08, replacing the "no search.list, under 100 units" rule)

- A fetch costs 20 × 100 for search plus about 10 for videos.list: about 2,010 units out of 10,000 per day.
- A daily unit counter (`quota_day`) resets at midnight Pacific Time, like YouTube's quota. `services/youtube.ts` counts the units; every fetch adds them, a failed one too, since YouTube charges every request it answers. The app only knows its own usage, so the counter is an estimate.
- With fewer than 2,100 units left today, Refresh is disabled.

When a fetch fails:

- A key error or `quotaExceeded` stops the fetch, keeps the current list and logs the error.
- Any other error on one item's search skips that item, and the fetch goes on with the rest. If every item fails, the fetch fails.
- An info button (ⓘ) in the strip, next to the remove button (2026-11-10). Tapping it pauses the video and opens a bottom sheet: a loading state, then a short Hebrew explanation of the video's topic, written by Gemini from a Google Search. Closing the sheet doesn't resume the video; tapping the video (or swiping to another) does. See §5a.
- A failed fetch, or one where no video passes the filters, keeps the current list and says so.

## 5a. Video info (Gemini)

Added 2026-11-10.

- Gemini is called only when the user taps ⓘ, never while scrolling or fetching.
- Before any request, `video_info` is checked. A saved answer is shown at once, without a request. Tapping ⓘ again on the same video never sends a second request, also while the first one is still running.
- The request sends the video's title, description (cut to 1,000 characters), item name and channel name, with the `google_search` tool on. The instruction: "הסבר בעברית, 150–250 מילים, על הנושא של הסרטון. השתמש רק בעובדות שמצאת בחיפוש. אם אין מידע מספיק, אמור זאת ואל תנחש. אל תציג רשימת מקורות."
- The content is Hebrew (2026-11-10): the video details are sent under Hebrew labels, and a rule "write the whole answer in Hebrew only, even when the video details and search results are in English" is set as the system instruction and repeated at the end of the prompt. An answer where under 60% of the letters are Hebrew is shown but not saved, and a saved one like that is asked again.
- A successful answer is saved in `video_info` with the model's name. Errors and empty answers are not saved, so the next tap tries again.
- Messages: no network or a timeout (20 s) → "אין חיבור"; HTTP 429 → "נגמרה המכסה להיום"; a response with no text → "לא נמצא מידע על הנושא". A missing key and other errors get their own short message.
- Each request is counted in `quota_day.geminiRequests`. Each answer is logged with its time and whether the response had `groundingMetadata`.
- Free tier: the daily request limit and Grounding with Google Search availability for the model must be checked in AI Studio for the project; Google's published numbers vary by model and change often.

## 6. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | Seed the item list from `db/seed.json` on first launch, when the `item` table is empty. The seed runs only once, in the schema v3 migration; 414 items, mostly small and specific (octopus, iron, black holes) | Must |
| F2 | Add items on the Topics tab, several at once separated by commas, skipping duplicates | Must |
| F3 | Remove and restore an item (Topics tab and the Feed's remove button with Undo); delete an item with a swipe | Must |
| F4 | "Refresh" button runs the full fetch process | Must |
| F5 | Filter by the rules and log the rejection reason | Must |
| F6 | List of up to 100 videos (20 items × 5) plus a reserve of up to 20 | Must |
| F7 | Feed with vertical scrolling and the official player | Must |
| F8 | Auto-skip a video when the player reports an error (for example, it was deleted, made private or can't be embedded), replacing it from the reserve. A slow video is never skipped: the user decides, since the cause may be weak reception. Changed on 2026-11-06 (was: skip a video that hasn't loaded within 3 seconds) | Must |
| F9 | Mark as "watched" after half the video has played: the player's own play time, counted across pauses and returns to the video, not counting buffering or time in the background. Decided on 2026-11-06 | Must |
| F10 | Preload the next video: the neighbors' players are already loaded with their videos (cued, not playing), and the next video starts as soon as the page snap begins after the finger lifts, not when it ends. No hidden or muted playback, to stay within YouTube's policies. Decided on 2026-11-06 | Nice to have |
| F11 | Status screen | Nice to have |
| F12 | Daily quota counter; Refresh disabled below 2,100 units left | Must |
| F13 | Video info sheet (ⓘ): a grounded Gemini explanation of the video's topic, cached in `video_info` (§5a). Added 2026-11-10 | Nice to have |

## 7. Data model (SQLite)

| Table | Fields |
| --- | --- |
| item | id, name, query, removed, removedAt, lastPickedAt, pickCount, createdAt |
| feed\_item | position, videoId, itemId, itemName, title, durationSec, isReserve, status, channelTitle, description |
| watched | videoId (primary key), watchedAt |
| fetch\_log | startedAt, durationMs, itemsPicked, fetched, passed, rejectedByRule, quotaUsed, error |
| quota\_day | date, unitsUsed, geminiRequests |
| video\_info | videoId (primary key), text, model, createdAt |

- The `topic`, `channel` and `channel_topic` tables are dropped. The migration (schema v3) drops them and keeps `watched`. It also rebuilds `feed_item` and `fetch_log`, so the current list and old fetch logs are gone after the upgrade (2026-11-08).
- `feed_item.itemId` and `itemName` replace `channelId` and `channelTitle`. The name is saved with each video, so the strip still shows it after the item is deleted.
- `item.name` is unique ignoring case (`COLLATE NOCASE`).
- `feed_item.status` is `unseen`, `watched` or `skipped`.
- `fetch_log.itemsPicked` is a JSON list with one `{itemId, name, results, passed, selected}` per drawn item, for the report (§4 Status).
- `fetch_log.rejectedByRule` is a JSON list with one `{videoId, rule, detail}` per rejected video (F5). The Status screen counts them per rule. Fetch logs older than 30 days are deleted when a new fetch is saved. Decided on 2026-11-06.
- `fetch_log.fetched` is the number of videos `videos.list` returned, which the filters then checked; `passed` is how many passed all rules. `fetch_log.error` names the failure and any skipped items, or is empty.
- `fetch_log.durationMs` is how long the fetch took, until the new list was saved. Replaces `finishedAt` (2026-11-08).
- `quota_day.date` is the Pacific Time date (`YYYY-MM-DD`); `unitsUsed` is the units spent that day.
- Schema v4 (2026-11-10): `feed_item.channelTitle` and `description` are saved by each fetch for the info sheet (videos saved before v4 have them empty). The feed doesn't read them; the info sheet does. `video_info` holds Gemini's saved answers; `quota_day.geminiRequests` counts the day's Gemini requests.
- Times are stored as milliseconds since 1970, and true/false as 1/0.

## 8. Non-functional requirements

- Switching between videos: under one second in 80% of cases.
- Opening the app with an existing list: under 2 seconds.
- Fetching: under 60 seconds and under 2,100 API units.
- Privacy: no server and no account; only requests to YouTube and, when the user taps ⓘ, to the Gemini API leave the phone (changed 2026-11-10).
- The info sheet: the explanation shows in under 8 seconds, and at once from `video_info`. It never slows down switching videos.
- YouTube policies: official player only, without hiding branding, controls or ads, and without downloading videos.

## 9. Decisions

- Maximum length: 3 minutes (180 seconds), the YouTube Shorts limit. Raised from 90 seconds on 2026-11-05, because real Shorts from the chosen channels run longer.
- "Watched" after half a video has played (F9). A watched video is saved to `watched` and its `feed_item` becomes `watched`, so later fetches leave it out.
- Feed (2026-11-06): no tap-to-pause (YouTube's controls do it), no counter, videos loop, and auto-skip only on a player error.
- Topic-based feed (2026-11-08): channels and the 2 fixed topics (World War II, Claude Code) are replaced by a dynamic item list and `search.list`. The quota budget rises from under 100 to about 2,010 units per fetch.
- Blocked words are listed in `lib/topics.ts` (agreed 2026-11-06). Matching ignores case and uses whole words. Blocked words use narrow phrases such as "reacts to" instead of plain "reaction", so titles like "chain reaction" aren't blocked.
- Video info (2026-11-10): an on-demand, grounded Gemini explanation per video, the one exception to "only YouTube" network calls. The sheet covers the paused player while it is open; the player's controls stay untouched and it resumes on tap.
- React Native with Expo.

## 10. Risks

| Risk | Level | Mitigation |
| --- | --- | --- |
| Player is slow in the feed | High | Keep exactly 3 players (the current video and its neighbors) and reuse them by changing their video, instead of creating a player per page. Creating a new player on every swipe stopped working after about 10 players (found in step 7.1) |
| Inaccurate Shorts detection | Medium | Combine length and aspect ratio, plus `videoDuration=short` in the search |
| Search returns off-topic or non-educational videos | Medium | Specific items, the query match rule and blocked words |
| Running out of daily quota | Medium | A fetch costs about 2,010 of 10,000 units; daily counter and a disabled Refresh below 2,100 left |
| Same videos on repeated draws | Low | Rotate suffix and order by pickCount; leave out watched videos |

## 11. Visual identity

**Mood:** Japanese, inspired by ukiyo-e woodblock prints. "Sennin" (仙人) is the mountain sage of Japanese folklore: calm, wise, solitary. The app should feel like a quiet place of learning at dusk, not a hyperactive social feed.

**Imagery and motifs:** cherry blossoms (sakura), swirling stylized clouds and wind, misty mountain ridges, a distant pagoda. Use them sparingly as decoration: on the empty state, the "That's it for today" screen, the app icon and the splash screen. Never over or on top of the video player.

**Palette:**

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Background | Deep Sea Night | #0E2A2F | All screen backgrounds |
| Main | Sunset | #E0533A | Primary buttons ("Refresh"), active states, progress |
| Second | Teal Mist | #2F8F8A | Secondary buttons, dividers |
| Accent | Cherry Blossom | #F3C6C8 | Small highlights: the item name above the video, icons, sakura decorations |
| Text | Silver | #DCDFDE | Body text and titles on the background |

**Contrast rules:** text on Sunset or Teal Mist buttons is Deep Sea Night and bold, not Silver (Silver on those colors is too low-contrast). Silver and Cherry Blossom are only for text on Deep Sea Night. A removed item on the Topics tab is shown in a dimmed Silver.

**Style:**
- Flat colors, soft rounded corners, no gradients except subtle cloud-like ones in decorative art.
- Calm motion: gentle fades, no bouncy animations.
- Hebrew and English text both supported; keep typography clean and simple. Titles and item names take the direction of their own first letter, so a Hebrew title starts on the right and an English one on the left, whatever the phone's language. App labels follow the phone's layout direction. Decided on 2026-11-06.
- Reference image: `assets/Sennin.mp4` (a short clip of the wandering swordsman under cherry blossoms; it replaces the planned `mood.jpg`). Use it for color and mood only, not as a UI element.
- Decorative art (2026-11-06): one dusk scene (`assets/images/dusk.jpg`) with sakura branches, swirling clouds, misty ridges, a pagoda and a low sun, behind the empty and end screens only. It fades in once loaded. Its middle third is plain dark sky, where the text sits. The app icon and splash use the same motif (sun, ridges, a sakura sprig). All of it is drawn by `scripts/generate_art.py` from the palette above, so rerun the script after a palette change.

**YouTube constraint:** the theme applies only around the player (the item name and title in the strip above it). The player itself keeps YouTube's branding, controls and ads untouched (see section 8).
