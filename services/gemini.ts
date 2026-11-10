// The only file that talks to the Gemini API: one generateContent request
// per tap on ⓘ, when the answer isn't saved yet (hooks/useVideoInfo.ts). The
// prompt and the response reading are pure functions in lib/videoInfo.ts.

import { GEMINI_MODEL, GEMINI_TIMEOUT_MS } from '@/config/gemini';
import { checkApiKey, type ApiKeyCheck } from '@/lib/apiKey';
import {
  buildRequestBody,
  classifyStatus,
  readAnswer,
  type GeminiAnswer,
  type GeminiFailure,
  type GeminiResponse,
  type VideoContext,
} from '@/lib/videoInfo';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type GeminiResult = { ok: true; answer: GeminiAnswer } | { ok: false; error: GeminiFailure };

// Expo inlines EXPO_PUBLIC_* variables only for a direct `process.env.NAME` read.
export function readGeminiKey(): ApiKeyCheck {
  return checkApiKey(process.env.EXPO_PUBLIC_GEMINI_KEY);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorMessage(body: unknown, status: number): string {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === 'string' ? message : `HTTP ${status}`;
}

/** Asks Gemini, with Google Search on, to explain the video's topic. */
export async function explainVideo(video: VideoContext): Promise<GeminiResult> {
  const key = readGeminiKey();
  if (!key.ok) {
    return { ok: false, error: { kind: 'noKey', message: `Gemini key ${key.reason}` } };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    // The key goes in a header, so it's never in a URL or a log line.
    const response = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.key },
      body: JSON.stringify(buildRequestBody(video)),
      signal: controller.signal,
    });
    const body = parseJson(await response.text());
    if (!response.ok) {
      return {
        ok: false,
        error: { kind: classifyStatus(response.status), message: errorMessage(body, response.status) },
      };
    }
    if (body === null || typeof body !== 'object') {
      return { ok: false, error: { kind: 'other', message: 'response is not JSON' } };
    }
    const answer = readAnswer(body as GeminiResponse);
    return answer === null
      ? { ok: false, error: { kind: 'empty', message: 'response has no text' } }
      : { ok: true, answer };
  } catch (error) {
    const message = controller.signal.aborted
      ? `timed out after ${GEMINI_TIMEOUT_MS / 1000} s`
      : String(error);
    return { ok: false, error: { kind: 'offline', message } };
  } finally {
    clearTimeout(timer);
  }
}
