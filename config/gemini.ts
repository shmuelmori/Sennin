// The Gemini settings for the video info sheet, in one place so the model is
// easy to swap. Read by services/gemini.ts and stored with each saved answer
// (video_info.model), so answers from different models can be told apart.

/** The Gemini model that writes the explanation. Needs Grounding with Google Search. */
export const GEMINI_MODEL = 'gemini-2.5-flash';

/** A request that takes longer is dropped and reported as "no connection". */
export const GEMINI_TIMEOUT_MS = 20_000;
