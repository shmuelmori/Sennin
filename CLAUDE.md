# Sennin

Android POC (React Native + Expo, TypeScript). Tapping "Refresh" draws 20 topics ("items") from a dynamic list in SQLite, searches YouTube for 5 English Shorts per item, and builds a feed of up to 100 videos that the user swipes through in the official YouTube player. No server, no accounts, no cost.

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
- The only network calls go to YouTube, plus the Gemini API for the ⓘ info sheet (spec §5a). No backend, analytics, crash reporting or other third-party services.
- Play videos only through `react-native-youtube-iframe`. Never hide or cover the player's branding, controls or ads, and never download or cache video files.
- The API keys come from `EXPO_PUBLIC_YOUTUBE_KEY` and `EXPO_PUBLIC_GEMINI_KEY` in `.env`. Never commit `.env` and never hard-code a key.

## YouTube Data API
- `search.list` costs 100 units per call. Call it exactly once per drawn item (20 per fetch) and nowhere else. A full fetch costs about 2,010 units and must stay under 2,100 (spec §5).
- Count every call's units in the daily `quota_day` counter, which resets at midnight Pacific Time. Refresh is disabled when fewer than 2,100 units are left today.
- On `quotaExceeded`, stop the fetch, keep the previous feed and log the error.
- Batch `videos.list` at 50 IDs per request.
- The API has no "is a Short" field. Detect Shorts by duration ≤ 180 s (3 minutes, the YouTube Shorts limit) and height > width.
- `player.embedWidth` and `player.embedHeight` are returned only when the request passes `maxWidth` or `maxHeight`.
- `contentDetails.duration` is ISO 8601 (e.g. `PT1M5S`). Parse it; don't string-match it.
- For every fetch, log each rejected video with the rule that rejected it, plus the quota used, in `fetch_log`.

## Gemini API (info sheet, spec §5a)
- Call Gemini only when the user taps ⓘ, never while scrolling or fetching. Check `video_info` first and show a saved answer without a request; never send two requests for the same video.
- The model name and the Google Search switch live only in `config/gemini.ts`. `services/gemini.ts` is the only file that calls Gemini.
- Google Search (the `google_search` tool) is off: the free tier returns HTTP 429 for every grounded request. Turn it on in `config/gemini.ts` only if billing is enabled. Count each request in `quota_day.geminiRequests`.

## Code conventions

**File size:** aim for under 300 lines per file, hard limit 350. If a file grows past that, split it before adding more.

**Smart vs. dumb components:**
- Screens in `app/` (Expo Router) are the only "smart" components: they call hooks (which read the DB and the API) and pass data down.
- Components in `components/` are presentational: props in, JSX out. No fetch, no SQLite, no business logic. They may hold local UI state only (e.g. pressed, visible).
- Data access and side effects live in custom hooks in `hooks/` (e.g. `useFeed`, `useItems`), which screens consume.

**Pure logic in `lib/`:**
- All business logic is pure functions in `lib/`, with no React, no network and no DB imports. Examples: the filter rules (section 5), sorting, parsing ISO 8601 durations, parsing comma-separated item input, the weighted item draw, and the shuffle that keeps two videos of the same item apart.
- Each filter rule is its own function returning either pass or a rejection reason, so rejections can be logged (F5) and tested.
- Every function in `lib/` has unit tests.

**Side effects are isolated:**
- `services/youtube.ts`: the only file that calls the YouTube Data API, and the only one that counts quota units.
- `services/gemini.ts`: the only file that calls the Gemini API.
- `db/`: the only folder that touches expo-sqlite.

**Folder structure:**
```
app/          screens (smart)
components/   presentational components (dumb)
hooks/        data and state hooks
lib/          pure logic + tests
services/     YouTube and Gemini API clients
config/       settings meant to be swapped (the Gemini model)
db/           SQLite schema and queries
theme/        colors and spacing from section 11
scripts/      dev tools, not part of the app (generate_art.py draws the art, icon and splash)
```

**General:**
- TypeScript strict mode, no `any`. Type the parts of the YouTube responses the app uses.
- Named exports, except route and layout files in `app/`, which Expo Router requires to be default exports.
- No new dependency without asking first.
- Build for one phone (Galaxy S24 FE), not a store release. Choose the simplest working solution, and add no state-management library unless the spec needs one.

## UI
- Define the palette from spec §11 once, in a theme file. Components import from it; no hex literals in components.
- Text on Sunset (#E0533A) or Teal Mist (#2F8F8A) buttons is Deep Sea Night (#0E2A2F) and bold. Use Silver and Cherry Blossom only for text on Deep Sea Night.
- The item name and title sit in a strip above the player and never cover it or its controls. Decorative art (sakura, clouds) never goes over the player.
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
