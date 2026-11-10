// The pure parts of the video info sheet (ⓘ in the feed strip): the prompt
// and request body sent to Gemini, reading its response, and the messages
// for each failure. services/gemini.ts sends the request.

/** What Gemini is told about the video. */
export type VideoContext = {
  title: string;
  description: string;
  /** The item (topic) the video was found for. */
  itemName: string;
  channelTitle: string;
};

/** Long descriptions are mostly links and hashtags; this much is plenty. */
export const MAX_DESCRIPTION_CHARS = 1_000;

export const INSTRUCTION =
  'הסבר בעברית, 150–250 מילים, על הנושא של הסרטון. השתמש רק בעובדות שמצאת בחיפוש. ' +
  'אם אין מידע מספיק, אמור זאת ואל תנחש. אל תציג רשימת מקורות.';

/**
 * The video's details are mostly English and the search results too, which
 * pulls the model toward an English answer, so the language is also set in
 * the system instruction and repeated at the end of the prompt.
 */
export const LANGUAGE_RULE =
  'כתוב את כל התשובה בעברית בלבד, גם כשפרטי הסרטון ותוצאות החיפוש באנגלית. ' +
  'מונחים ושמות מקובלים באנגלית מותר לצרף בסוגריים.';

/** At least this share of an answer's letters must be Hebrew. */
export const MIN_HEBREW_SHARE = 0.6;

/** Cuts the description to MAX_DESCRIPTION_CHARS, marking the cut with "…". */
export function trimDescription(description: string): string {
  const text = description.trim();
  return text.length <= MAX_DESCRIPTION_CHARS
    ? text
    : `${text.slice(0, MAX_DESCRIPTION_CHARS).trimEnd()}…`;
}

/**
 * The prompt: the instruction, the video's topic, title, channel and
 * description under Hebrew labels, and the language rule again at the end.
 */
export function buildPrompt(video: VideoContext): string {
  const description = trimDescription(video.description);
  return [
    INSTRUCTION,
    '',
    'פרטי הסרטון:',
    `נושא: ${video.itemName}`,
    `כותרת: ${video.title}`,
    `ערוץ: ${video.channelTitle || '(לא ידוע)'}`,
    `תיאור: ${description || '(אין)'}`,
    '',
    LANGUAGE_RULE,
  ].join('\n');
}

export type GeminiRequestBody = {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: 'user'; parts: { text: string }[] }[];
  tools: { google_search: Record<string, never> }[];
};

/** generateContent's body, with the google_search tool on, so the answer is grounded. */
export function buildRequestBody(video: VideoContext): GeminiRequestBody {
  return {
    systemInstruction: { parts: [{ text: LANGUAGE_RULE }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(video) }] }],
    tools: [{ google_search: {} }],
  };
}

/** The parts of a generateContent response the app reads. */
export type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: unknown[];
    };
  }[];
};

export type GeminiAnswer = {
  text: string;
  /** True when the response carries groundingMetadata, i.e. it searched. */
  grounded: boolean;
  searchQueries: string[];
  sourceCount: number;
};

/** The first candidate's text and grounding. null when there is no text. */
export function readAnswer(response: GeminiResponse): GeminiAnswer | null {
  const candidate = response.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
  if (text === '') return null;
  const metadata = candidate?.groundingMetadata;
  return {
    text,
    grounded: metadata !== undefined,
    searchQueries: (metadata?.webSearchQueries ?? []).filter(
      (query): query is string => typeof query === 'string',
    ),
    sourceCount: metadata?.groundingChunks?.length ?? 0,
  };
}

const HEBREW_LETTER = /[\u05D0-\u05EA]/u;
const LETTER = /\p{L}/u;

/**
 * Whether the text is written in Hebrew: at least MIN_HEBREW_SHARE of its
 * letters are Hebrew, so English names and terms inside it are fine.
 */
export function isMostlyHebrew(text: string): boolean {
  let letters = 0;
  let hebrew = 0;
  for (const char of text) {
    if (!LETTER.test(char)) continue;
    letters++;
    if (HEBREW_LETTER.test(char)) hebrew++;
  }
  return letters > 0 && hebrew / letters >= MIN_HEBREW_SHARE;
}

export type GeminiFailureKind =
  | 'noKey' // EXPO_PUBLIC_GEMINI_KEY is missing or malformed, nothing was sent
  | 'offline' // no response: no network, or timed out
  | 'quota' // HTTP 429: the day's (or minute's) requests are used up
  | 'empty' // a response with no text
  | 'other'; // any other HTTP error, or a body that isn't JSON

export type GeminiFailure = { kind: GeminiFailureKind; message: string };

/** The kind of an HTTP error response. */
export function classifyStatus(status: number): GeminiFailureKind {
  return status === 429 ? 'quota' : 'other';
}

/** The message shown in the sheet. */
export function describeFailure(kind: GeminiFailureKind): string {
  switch (kind) {
    case 'noKey':
      return 'חסר מפתח Gemini (EXPO_PUBLIC_GEMINI_KEY בקובץ ‎.env)';
    case 'offline':
      return 'אין חיבור';
    case 'quota':
      return 'נגמרה המכסה להיום';
    case 'empty':
      return 'לא נמצא מידע על הנושא';
    case 'other':
      return 'משהו השתבש. נסה שוב מאוחר יותר.';
  }
}

/** The [gemini] log line for an answer. */
export function formatAnswerLine(videoId: string, answer: GeminiAnswer, elapsedMs: number): string {
  const grounding = answer.grounded
    ? `grounded (${answer.sourceCount} sources, queries: ${answer.searchQueries.join(' | ') || 'none'})`
    : 'NOT grounded: no groundingMetadata';
  return `[gemini] ${videoId}: ${answer.text.length} chars in ${elapsedMs} ms, ${grounding}`;
}
