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
| Topics | 2 topics hard-coded: World War II, Quantum Computing, with keywords per topic |
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
| Feed | Vertical FlatList with pagingEnabled |
| Player | react-native-youtube-iframe (official IFrame inside react-native-webview) |
| Network | fetch against YouTube Data API v3 |
| Storage | expo-sqlite |
| API key | .env file (EXPO\_PUBLIC\_YOUTUBE\_KEY), restricted to YouTube Data API only |

## 4. Screens

**Navigation:** a stack with Feed as the home screen. Sources and Status open from buttons in the Feed's header, and Back returns to the Feed. No tab bar, so the feed keeps the full screen height.

**Feed**

- Full-screen video, channel name and title at the bottom, a "4 of 15" counter.
- Swipe up: next video. Swipe down: previous video. Tap: pause and resume.
- "Refresh" button: fetch and build a new list.
- No list yet: empty screen with a "Refresh" button. End of list: "That's it for today".

**Sources**

- Channel list with thumbnail, name and assigned topic.
- Add by link or @handle, remove by swiping, assign to a topic.

**Status**

- Time of the last fetch, how many videos were fetched, how many were rejected and by which rule, and API units used.

## 5. Fetch process

1. For each channel: playlistItems.list on the uploads playlist, up to 50 items.
2. Remove videos that were already watched or are already in the list.
3. videos.list (contentDetails, statistics, status, player) in batches of 50.
4. Filter by the rules, logging the rejection reason for each video.
5. Sort: videos new since the previous fetch first, then by view count.
6. 15 videos for the feed plus up to 10 in reserve.

| Rule | Value |
| --- | --- |
| Length | Up to 90 seconds |
| Vertical | Height greater than width |
| Embeddable | status.embeddable = true |
| Keyword | A topic keyword in the title or description (single-topic channels exempt) |
| Blocked words | e.g. reaction, giveaway, #meme |
| Minimum views | 1,000 (does not apply to videos from the last 48 hours) |
| Live stream | Rejected |

Quota: a fetch with 30 channels costs about 60 units out of 10,000 per day. search.list is not used.

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
| F8 | Auto-skip a video that hasn't loaded within 3 seconds, replacing it from the reserve | Must |
| F9 | Mark as "watched" after half the video has played | Must |
| F10 | Preload the next video | Nice to have |
| F11 | Status screen | Nice to have |

## 7. Data model (SQLite)

| Table | Fields |
| --- | --- |
| topic | id, name, keywords |
| channel | channelId, title, uploadsPlaylistId, thumbnailUrl, addedAt |
| channel\_topic | channelId, topicId |
| feed\_item | position, videoId, channelId, title, durationSec, isReserve, status |
| watched | videoId (primary key), watchedAt |
| fetch\_log | startedAt, fetched, rejectedByRule, quotaUsed, error |

## 8. Non-functional requirements

- Switching between videos: under one second in 80% of cases.
- Opening the app with an existing list: under 2 seconds.
- Fetching: under 60 seconds and under 100 API units.
- Privacy: no server and no account; only requests to YouTube leave the phone.
- YouTube policies: official player only, without hiding branding, controls or ads, and without downloading videos.

## 9. Decisions

- Maximum length: 90 seconds.
- "Watched" after half a video.
- 2 topics only.
- React Native with Expo.

## 10. Risks

| Risk | Level | Mitigation |
| --- | --- | --- |
| Player is slow in the feed | High | Render a player only for the current video and its neighbors; test in the first week |
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
| Accent | Cherry Blossom | #F3C6C8 | Small highlights: the "4 of 15" counter, icons, sakura decorations |
| Text | Silver | #DCDFDE | Body text and titles on the background |

**Contrast rules:** text on Sunset or Teal Mist buttons is Deep Sea Night and bold, not Silver (Silver on those colors is too low-contrast). Silver and Cherry Blossom are only for text on Deep Sea Night.

**Style:**
- Flat colors, soft rounded corners, no gradients except subtle cloud-like ones in decorative art.
- Calm motion: gentle fades, no bouncy animations.
- Hebrew and English text both supported; keep typography clean and simple.
- Reference image: `assets/reference/mood.jpg` (the wandering swordsman under cherry blossoms). Use it for color and mood only, not as a UI element.

**YouTube constraint:** the theme applies only around the player (overlays for channel name, title and counter). The player itself keeps YouTube's branding, controls and ads untouched (see section 8).
