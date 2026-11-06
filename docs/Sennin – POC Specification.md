# Sennin – POC Specification

Nov 4, 2026 · @shmuel

**Project:** Sennin · **Document type:** POC specification · **Platform:** Android

## 1. Goal

Prove that, at the tap of a button, you can get a feed of 15 educational Shorts from selected YouTube channels and scroll between them smoothly inside an Android app. No server and no cost.

Questions the POC answers:

1. Can Shorts be reliably identified through the YouTube Data API?
2. Do a manual channel list and simple filter rules produce a relevant feed?
3. Does YouTube's official player allow switching between videos in under one second?
4. Is React Native with Expo enough, without any Android-specific code?

## 2. Scope

| Area | In scope |
| --- | --- |
| Platform | Android, single device (Galaxy S24 FE), not distributed via the store |
| Topics | 2 topics hard-coded: World War II, Claude Code, with keywords per topic |
| Sources | Adding and removing YouTube channels from within the app |
| Fetching | Manual only, via a "Refresh" button |
| Filtering | Fixed rules (section 5) |
| Feed | 15 videos, full screen, vertical scrolling, official YouTube player |
| History | Logging watched videos to prevent repeats |

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

## 4. Screens

**Navigation:** a stack with Feed as the home screen. Sources and Status open from buttons in the Feed's header, and Back returns to the Feed. No tab bar, so the feed keeps the full screen height.

**Feed**

- Full-screen video at the top of the page, with the channel name and title in a strip below it, so nothing covers the player.
- Swipe up: next video. Swipe down: previous video.
- Pause and resume use the YouTube player's own controls. The app adds no tap handling of its own, because catching taps would mean covering the player.
- A video loops when it ends, like in the Shorts app.
- No "4 of 15" counter.
- "Refresh" button: fetch and build a new list.
- No list yet: empty screen with a "Refresh" button. End of list: "That's it for today".
- Pause, counter and loop decided on 2026-11-06.

**Sources**

- Channel list with thumbnail, name and topic tags.
- Add by link or @handle, picking one or both topics in the add form. The Add button stays disabled until a topic is picked.
- Remove by swiping a row sideways, which uncovers a "Remove" button. Tapping it removes the channel.
- Tap a topic tag on a row to assign or unassign that topic. A channel always keeps at least one topic (F3).
- Add, remove and topic behavior decided on 2026-11-06.

**Status**

- Time of the last fetch, how many videos were fetched, how many were rejected and by which rule, and API units used.
- Every rule is listed in the §5 order, including rules that rejected nothing. The fetch's error (a failure or skipped channels) is shown when there is one, and so is whether the API key is loaded. Added on 2026-11-06.

## 5. Fetch process

1. For each channel: playlistItems.list on the uploads playlist, up to 50 items.
2. Remove videos that were already watched or are already in the list.
3. videos.list (snippet, contentDetails, statistics, status, player, liveStreamingDetails) in batches of 50. Extra parts cost no extra units. `snippet` gives the title, description, publish date and live state.
4. Filter by the rules, logging the rejection reason for each video.
5. Sort: videos new since the previous fetch first, then by view count.
6. 15 videos for the feed plus up to 10 in reserve.

| Rule | Value |
| --- | --- |
| Length | Up to 3 minutes (180 seconds) |
| Vertical | Height greater than width |
| Embeddable | status.embeddable = true |
| Keyword | A topic keyword in the title or description (channels assigned to exactly one topic are exempt) |
| Blocked words | e.g. "reacts to", "reaction video", giveaway, #meme (not plain "reaction", which also blocks "chain reaction") |
| Minimum views | 1,000 (does not apply to videos from the last 48 hours) |
| Live stream | Rejected: `snippet.liveBroadcastContent` is live or upcoming, or `liveStreamingDetails` is present (streams that have ended) |

The rules run in this order: live stream, length, vertical, embeddable, blocked words, keyword, minimum views. Each rejected video is logged with the first rule that rejects it, so the counts per rule add up to the number of rejected videos.

Quota: a fetch with 30 channels costs about 60 units out of 10,000 per day. search.list is not used.

When a fetch fails (decided on 2026-11-06):

- A key or quota error stops the fetch. Any other error on one channel's uploads (for example, the channel was deleted) skips that channel, and the fetch goes on with the rest. If every channel fails, the fetch fails.
- A failed fetch, or one where no video passes the filters, keeps the current list and says so.
- "New since the previous fetch" (step 5) means published after the last completed fetch started. A fetch is completed once `videos.list` has answered.

## 6. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | Add a channel by link or @handle, and resolve its channelId and uploads playlist | Must |
| F2 | Remove a channel; videos already fetched from it stay in the list | Must |
| F3 | Assign each channel to one topic or both | Must |
| F4 | "Refresh" button runs the full fetch process | Must |
| F5 | Filter by the rules and log the rejection reason | Must |
| F6 | List of 15 videos plus a reserve | Must |
| F7 | Feed with vertical scrolling and the official player | Must |
| F8 | Auto-skip a video when the player reports an error (for example, it was deleted, made private or can't be embedded), replacing it from the reserve. A slow video is never skipped: the user decides, since the cause may be weak reception. Changed on 2026-11-06 (was: skip a video that hasn't loaded within 3 seconds) | Must |
| F9 | Mark as "watched" after half the video has played: the player's own play time, counted across pauses and returns to the video, not counting buffering or time in the background. Decided on 2026-11-06 | Must |
| F10 | Preload the next video: the neighbors' players are already loaded with their videos (cued, not playing), and the next video starts as soon as the page snap begins after the finger lifts, not when it ends. No hidden or muted playback, to stay within YouTube's policies. Decided on 2026-11-06 | Nice to have |
| F11 | Status screen | Nice to have |

## 7. Data model (SQLite)

| Table | Fields |
| --- | --- |
| topic | id, name, keywords |
| channel | channelId, title, uploadsPlaylistId, thumbnailUrl, addedAt |
| channel\_topic | channelId, topicId |
| feed\_item | position, videoId, channelId, channelTitle, title, durationSec, isReserve, status |
| watched | videoId (primary key), watchedAt |
| fetch\_log | startedAt, fetched, rejectedByRule, quotaUsed, error |

- `feed_item.channelTitle` is saved with each video, so videos from a removed channel still show their channel name (F2). Added on 2026-11-06.
- `feed_item.status` is `unseen`, `watched` or `skipped`.
- `fetch_log.rejectedByRule` is a JSON list with one `{videoId, rule, detail}` per rejected video (F5). The Status screen counts them per rule. Fetch logs older than 30 days are deleted when a new fetch is saved. Decided on 2026-11-06.
- `fetch_log.fetched` is the number of videos `videos.list` returned, which the filters then checked. It is 0 for a fetch that stopped on an error. `fetch_log.error` names the failure and any skipped channels, or is empty. Decided on 2026-11-06.
- Times are stored as milliseconds since 1970, and true/false as 1/0.

## 8. Non-functional requirements

- Switching between videos: under one second in 80% of cases.
- Opening the app with an existing list: under 2 seconds.
- Fetching: under 60 seconds and under 100 API units.
- Privacy: no server and no account; only requests to YouTube leave the phone.
- YouTube policies: official player only, without hiding branding, controls or ads, and without downloading videos.

## 9. Decisions

- Maximum length: 3 minutes (180 seconds), the YouTube Shorts limit. Raised from 90 seconds on 2026-11-05, because real Shorts from the chosen channels run longer.
- "Watched" after half a video has played (F9). A watched video is saved to `watched` and its `feed_item` becomes `watched`, so later fetches leave it out.
- Feed (2026-11-06): no tap-to-pause (YouTube's controls do it), no "4 of 15" counter, videos loop, and auto-skip only on a player error.
- 2 topics only: World War II and Claude Code. Claude Code replaced Quantum Computing on 2026-11-06.
- Keywords and blocked words are listed in `lib/topics.ts` (agreed 2026-11-06). Matching ignores case and uses whole words. Hebrew words may take a prefix letter (ה, ב, ל, ו, מ, ש, כ). Blocked words use narrow phrases such as "reacts to" instead of plain "reaction", so titles like "chain reaction" or "Churchill's reaction" aren't blocked.
- React Native with Expo.

## 10. Risks

| Risk | Level | Mitigation |
| --- | --- | --- |
| Player is slow in the feed | High | Keep exactly 3 players (the current video and its neighbors) and reuse them by changing their video, instead of creating a player per page. Creating a new player on every swipe stopped working after about 10 players (found in step 7.1) |
| Inaccurate Shorts detection | Medium | Combine length and aspect ratio |
| Non-educational videos from good channels | Medium | Keywords and blocked words |
| Few new videos | Low | Fill in with older unwatched videos |

## 11. Visual identity

**Mood:** Japanese, inspired by ukiyo-e woodblock prints. "Sennin" (仙人) is the mountain sage of Japanese folklore: calm, wise, solitary. The app should feel like a quiet place of learning at dusk, not a hyperactive social feed.

**Imagery and motifs:** cherry blossoms (sakura), swirling stylized clouds and wind, misty mountain ridges, a distant pagoda. Use them sparingly as decoration: on the empty state, the "That's it for today" screen, the app icon and the splash screen. Never over or on top of the video player.

**Palette:**

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Background | Deep Sea Night | #0E2A2F | All screen backgrounds |
| Main | Sunset | #E0533A | Primary buttons ("Refresh"), active states, progress |
| Second | Teal Mist | #2F8F8A | Secondary buttons, topic tags, dividers |
| Accent | Cherry Blossom | #F3C6C8 | Small highlights: the channel name under the video, icons, sakura decorations |
| Text | Silver | #DCDFDE | Body text and titles on the background |

**Contrast rules:** text on Sunset or Teal Mist buttons is Deep Sea Night and bold, not Silver (Silver on those colors is too low-contrast). Silver and Cherry Blossom are only for text on Deep Sea Night.

**Style:**
- Flat colors, soft rounded corners, no gradients except subtle cloud-like ones in decorative art.
- Calm motion: gentle fades, no bouncy animations.
- Hebrew and English text both supported; keep typography clean and simple. Titles and channel names take the direction of their own first letter, so a Hebrew title starts on the right and an English one on the left, whatever the phone's language. App labels follow the phone's layout direction. Decided on 2026-11-06.
- Reference image: `assets/Sennin.mp4` (a short clip of the wandering swordsman under cherry blossoms; it replaces the planned `mood.jpg`). Use it for color and mood only, not as a UI element.
- Decorative art (2026-11-06): one dusk scene (`assets/images/dusk.jpg`) with sakura branches, swirling clouds, misty ridges, a pagoda and a low sun, behind the empty and end screens only. It fades in once loaded. Its middle third is plain dark sky, where the text sits. The app icon and splash use the same motif (sun, ridges, a sakura sprig). All of it is drawn by `scripts/generate_art.py` from the palette above, so rerun the script after a palette change.

**YouTube constraint:** the theme applies only around the player (the channel name and title below it). The player itself keeps YouTube's branding, controls and ads untouched (see section 8).
