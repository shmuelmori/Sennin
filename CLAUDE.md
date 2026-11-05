# Sennin

Android POC (React Native + Expo, TypeScript). Tapping "Refresh" builds a feed of 15 educational YouTube Shorts from hand-picked channels, and the user swipes through them in the official YouTube player. No server, no accounts, no cost.

The spec is the source of truth: `docs/Sennin – POC Specification.md`. Read the relevant section before building a feature. If a request contradicts the spec, say so before writing code, and update the spec when a decision changes.

Build progress is tracked in `docs/status.md`. Check it at the start of a session, and mark a step done (with date and branch) when it is merged.

## Commands
- Dev server: `npx expo start` (or `npm start`), then scan the QR code with Expo Go on the phone. Add `--tunnel` if the phone can't reach the PC over Wi-Fi.
- Add a dependency: `npx expo install <pkg>` (add `--dev` for dev tools), not `npm install`, so versions match the Expo SDK.
- Typecheck: `npx tsc --noEmit` (or `npm run typecheck`)
- Lint: `npx expo lint .` (or `npm run lint`). Keep the `.`: without it, `expo lint` only checks `app/` and `components/`.
- Unit tests: `npx jest` (or `npm test`). Test files sit next to the code as `lib/<name>.test.ts`.

## Hard constraints
- Must run in Expo Go: no custom native code, no dev client, no libraries that Expo Go doesn't support. Answering "is Expo enough?" is one of the POC's goals.
- The only network calls go to YouTube. No backend, analytics, crash reporting or other third-party services.
- Play videos only through `react-native-youtube-iframe`. Never hide or cover the player's branding, controls or ads, and never download or cache video files.
- The API key comes from `EXPO_PUBLIC_YOUTUBE_KEY` in `.env`. Never commit `.env` and never hard-code the key.

## YouTube Data API
- Never call `search.list` (100 units per call). A full fetch must stay under 100 units.
- Resolve an `@handle` with `channels.list` and `forHandle=`. Get the uploads playlist from `contentDetails.relatedPlaylists.uploads`.
- Batch `videos.list` at 50 IDs per request.
- The API has no "is a Short" field. Detect Shorts by duration ≤ 180 s (3 minutes, the YouTube Shorts limit) and height > width.
- `player.embedWidth` and `player.embedHeight` are returned only when the request passes `maxWidth` or `maxHeight`.
- `contentDetails.duration` is ISO 8601 (e.g. `PT1M5S`). Parse it; don't string-match it.
- For every fetch, log each rejected video with the rule that rejected it, plus the quota used, in `fetch_log`.

## Code conventions

**File size:** aim for under 300 lines per file, hard limit 350. If a file grows past that, split it before adding more.

**Smart vs. dumb components:**
- Screens in `app/` (Expo Router) are the only "smart" components: they call hooks (which read the DB and the API) and pass data down.
- Components in `components/` are presentational: props in, JSX out. No fetch, no SQLite, no business logic. They may hold local UI state only (e.g. pressed, visible).
- Data access and side effects live in custom hooks in `hooks/` (e.g. `useFeed`, `useChannels`), which screens consume.

**Pure logic in `lib/`:**
- All business logic is pure functions in `lib/`, with no React, no network and no DB imports. Examples: the filter rules (section 5), sorting, parsing ISO 8601 durations, parsing a channel link or @handle.
- Each filter rule is its own function returning either pass or a rejection reason, so rejections can be logged (F5) and tested.
- Every function in `lib/` has unit tests.

**Side effects are isolated:**
- `services/youtube.ts`: the only file that calls the YouTube Data API, and the only one that counts quota units.
- `db/`: the only folder that touches expo-sqlite.

**Folder structure:**
```
app/          screens (smart)
components/   presentational components (dumb)
hooks/        data and state hooks
lib/          pure logic + tests
services/     YouTube API client
db/           SQLite schema and queries
theme/        colors and spacing from section 11
```

**General:**
- TypeScript strict mode, no `any`. Type the parts of the YouTube responses the app uses.
- Named exports, except route and layout files in `app/`, which Expo Router requires to be default exports.
- No new dependency without asking first.
- Build for one phone (Galaxy S24 FE), not a store release. Choose the simplest working solution, and add no state-management library unless the spec needs one.

## UI
- Define the palette from spec §11 once, in a theme file. Components import from it; no hex literals in components.
- Text on Sunset (#E0533A) or Teal Mist (#2F8F8A) buttons is Deep Sea Night (#0E2A2F) and bold. Use Silver and Cherry Blossom only for text on Deep Sea Night.
- Overlays (channel name, title, "4 of 15") sit at the bottom and must not cover the player's controls. Decorative art (sakura, clouds) never goes over the player.
- Use calm motion only: fades, no bounce or spring animations.
- Text can be Hebrew or English, so don't hard-code left alignment.

## Feed performance
- Video switching is the riskiest part of the POC. Mount a player only for the current video and its neighbors, never one per list item.
- Target: switching videos takes under 1 s in 80% of cases. Check this on the phone; the player is a WebView, so a desktop browser doesn't show real behavior.

## Before calling a task done
- Typecheck and lint both pass.
- Unit tests for any changed `lib/` code pass.
- For any change to the feed or player, test it on the phone in Expo Go.

## Git workflow

- Never commit directly to `main`. Every code change happens on a separate branch created from an up-to-date `main`.
- Branch names: `feature/<short-name>`, `fix/<short-name>` or `chore/<short-name>` (e.g. `feature/channel-sources`).
- Before starting work, check the current branch. If it is `main`, create a new branch first.
- Commit in small, focused steps with clear messages.
- Before merging into `main`, always stop and ask the user for approval. Show a short summary of what changed and which files were touched. Do not merge, push to `main`, rebase `main` or delete branches without an explicit "yes" in the chat.
- If tests exist for the changed code, run them before asking to merge, and report the results.
