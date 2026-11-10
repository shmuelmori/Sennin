// The Gemini settings for the video info sheet, in one place so they are easy
// to swap. Read by services/gemini.ts; the model is also stored with each
// saved answer (video_info.model), so answers from different models can be
// told apart.

/**
 * The Gemini model that writes the explanation. gemini-2.5-flash is closed to
 * new users (2026-11-10).
 */
export const GEMINI_MODEL = 'gemini-3.5-flash';

/**
 * Whether the request turns on the google_search tool (grounded answers).
 * Off since 2026-11-10: on the free tier every grounded request got HTTP 429
 * on every model tried. Turn it on only with billing enabled on the project.
 */
export const GEMINI_GOOGLE_SEARCH = false;

/** A request that takes longer is dropped and reported as "no connection". */
export const GEMINI_TIMEOUT_MS = 20_000;
