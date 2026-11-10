import { useCallback, useRef, useState } from 'react';

import { GEMINI_MODEL } from '@/config/gemini';
import { useDatabase } from '@/db/DatabaseProvider';
import { addGeminiRequest } from '@/db/quota';
import { getVideoContext, getVideoInfo, saveVideoInfo } from '@/db/videoInfo';
import { pacificDate } from '@/lib/quota';
import { describeFailure, formatAnswerLine, isMostlyHebrew } from '@/lib/videoInfo';
import { explainVideo } from '@/services/gemini';

// The info sheet's data (ⓘ in the feed strip). Gemini is asked only from
// `open`, i.e. only on a tap. A saved answer in video_info is shown at once,
// with no request. While a request for a video is running, opening it again
// waits for the same request instead of sending another. The content must be
// Hebrew: an answer that isn't is shown but not saved, and a saved one that
// isn't (from before the Hebrew check) is asked again. Logs [gemini] lines.

export type VideoInfoState =
  | { kind: 'closed' }
  | { kind: 'loading'; videoId: string }
  | { kind: 'ready'; videoId: string; text: string }
  | { kind: 'failed'; videoId: string; message: string };

type Outcome = { ok: true; text: string } | { ok: false; message: string };

function log(line: string) {
  console.log(line.startsWith('[gemini]') ? line : `[gemini] ${line}`);
}

export function useVideoInfo() {
  const db = useDatabase();
  const [state, setState] = useState<VideoInfoState>({ kind: 'closed' });
  // The video the sheet shows now; a late answer for another one isn't shown.
  const openId = useRef<string | null>(null);
  const running = useRef(new Map<string, Promise<Outcome>>());

  const load = useCallback(
    async (videoId: string): Promise<Outcome> => {
      const startedAt = Date.now();
      const saved = await getVideoInfo(db, videoId);
      if (saved !== null && !isMostlyHebrew(saved.text)) {
        log(`${videoId}: saved answer isn't Hebrew, asking again`);
      } else if (saved !== null) {
        log(`${videoId}: from video_info (${saved.model}), no request`);
        return { ok: true, text: saved.text };
      }
      const video = await getVideoContext(db, videoId);
      if (video === null) {
        log(`${videoId}: not in feed_item, no request`);
        return { ok: false, message: describeFailure('empty') };
      }
      // Counted before sending, so a request that fails still counts.
      await addGeminiRequest(db, pacificDate(startedAt)).catch((cause: unknown) => {
        log(`counting the request failed: ${String(cause)}`);
      });
      const result = await explainVideo(video);
      if (!result.ok) {
        log(`${videoId}: ${result.error.kind}: ${result.error.message} (${Date.now() - startedAt} ms)`);
        return { ok: false, message: describeFailure(result.error.kind) };
      }
      log(formatAnswerLine(videoId, result.answer, Date.now() - startedAt));
      if (!isMostlyHebrew(result.answer.text)) {
        log(`${videoId}: answer isn't Hebrew, shown but not saved`);
        return { ok: true, text: result.answer.text };
      }
      await saveVideoInfo(db, {
        videoId,
        text: result.answer.text,
        model: GEMINI_MODEL,
        createdAtMs: Date.now(),
      }).catch((cause: unknown) => log(`saving ${videoId} failed: ${String(cause)}`));
      return { ok: true, text: result.answer.text };
    },
    [db],
  );

  /** Opens the sheet for a video: the saved answer, or a request to Gemini. */
  const open = useCallback(
    (videoId: string) => {
      openId.current = videoId;
      setState({ kind: 'loading', videoId });
      let request = running.current.get(videoId);
      if (request === undefined) {
        request = load(videoId)
          .catch((cause: unknown): Outcome => {
            log(`${videoId}: ${String(cause)}`);
            return { ok: false, message: describeFailure('other') };
          })
          .finally(() => running.current.delete(videoId));
        running.current.set(videoId, request);
      }
      void request.then((outcome) => {
        if (openId.current !== videoId) return;
        setState(
          outcome.ok
            ? { kind: 'ready', videoId, text: outcome.text }
            : { kind: 'failed', videoId, message: outcome.message },
        );
      });
    },
    [load],
  );

  const close = useCallback(() => {
    openId.current = null;
    setState({ kind: 'closed' });
  }, []);

  return { state, open, close };
}
