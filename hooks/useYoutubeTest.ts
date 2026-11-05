import { useCallback, useRef, useState } from 'react';

import {
  applyFilters,
  countRejectionsByRule,
  RULE_NAMES,
  type FilterContext,
} from '@/lib/filterRules';
import { BLOCKED_WORDS, TOPICS } from '@/lib/topics';
import { describeYoutubeError, type YoutubeError } from '@/lib/youtubeErrors';
import type { ChannelLookup } from '@/lib/youtubeRequests';
import type { FetchedVideo } from '@/lib/youtubeResponses';
import { createYoutubeClient, type YoutubeClient } from '@/services/youtube';

// Temporary check for step 4.1, run from the Status screen: resolves one real
// channel, fetches its latest uploads and their details, and logs "[youtube]"
// lines to the Expo terminal. Step 5.2 replaces it with "Add a channel".

const TEST_CHANNEL: ChannelLookup = { kind: 'handle', handle: '3blue1brown' };
/** A handle no channel should have, to check that an unknown handle reports notFound. */
const UNKNOWN_CHANNEL: ChannelLookup = { kind: 'handle', handle: 'sennin-no-such-channel-7q' };
const SAMPLE_COUNT = 3;

export type YoutubeTestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'passed' | 'failed'; summary: string };

function log(line: string) {
  console.log(`[youtube] ${line}`);
}

function failed(error: YoutubeError, step: string, client: YoutubeClient | null): YoutubeTestState {
  log(`${step} failed: ${error.kind} (HTTP ${error.status ?? '-'}): ${error.message}`);
  if (client) {
    log(`quota: ${client.unitsUsed()} units`);
  }
  return { status: 'failed', summary: describeYoutubeError(error) };
}

function describeVideo(video: FetchedVideo): string {
  const size = `${video.embedWidth ?? '?'}x${video.embedHeight ?? '?'}`;
  return `${video.videoId} ${video.durationSec ?? '?'} s ${size} ${video.viewCount ?? '?'} views "${video.title}"`;
}

/** Runs the shorts checks with the channel in one topic, so the keyword rule is skipped. */
function logFilterPreview(videos: readonly FetchedVideo[], channelId: string): number {
  const context: FilterContext = {
    nowMs: Date.now(),
    channelTopics: new Map([[channelId, [TOPICS[0].id]]]),
    topics: TOPICS,
    blockedWords: BLOCKED_WORDS,
  };
  const { passed, rejected } = applyFilters(videos, context);
  log(`filters: ${passed.length} passed, ${rejected.length} rejected`);
  const counts = countRejectionsByRule(rejected);
  for (const rule of RULE_NAMES) {
    const first = rejected.find((rejection) => rejection.rule === rule);
    if (first) {
      log(`  ${rule}: ${counts[rule]}, e.g. ${first.videoId} (${first.detail})`);
    }
  }
  for (const video of passed.slice(0, SAMPLE_COUNT)) {
    log(`  passed: ${describeVideo(video)}`);
  }
  return passed.length;
}

async function runYoutubeTest(): Promise<YoutubeTestState> {
  const startedAt = Date.now();
  const created = createYoutubeClient();
  if (!created.ok) {
    return failed(created.error, 'setup', null);
  }
  const client = created.value;

  const channel = await client.resolveChannel(TEST_CHANNEL);
  if (!channel.ok) {
    return failed(channel.error, 'channels.list', client);
  }
  const { channelId, title, uploadsPlaylistId, thumbnailUrl } = channel.value;
  log(`channel: ${title} (${channelId}), uploads ${uploadsPlaylistId}, thumbnail ${thumbnailUrl ?? 'none'}`);

  const unknown = await client.resolveChannel(UNKNOWN_CHANNEL);
  log(`unknown handle: ${unknown.ok ? `unexpectedly found ${unknown.value.title}` : unknown.error.kind}`);

  const ids = await client.listUploads(uploadsPlaylistId);
  if (!ids.ok) {
    return failed(ids.error, 'playlistItems.list', client);
  }
  log(`uploads: ${ids.value.length} video IDs`);

  const videos = await client.getVideos(ids.value);
  if (!videos.ok) {
    return failed(videos.error, 'videos.list', client);
  }
  log(`videos: ${videos.value.length} with details (${ids.value.length - videos.value.length} missing)`);
  const passedCount = logFilterPreview(videos.value, channelId);

  const units = client.unitsUsed();
  log(`quota: ${units} units, ${Date.now() - startedAt} ms`);
  return {
    status: 'passed',
    summary: `${title}: ${videos.value.length} videos, ${passedCount} pass the filters, ${units} units`,
  };
}

export function useYoutubeTest() {
  const [state, setState] = useState<YoutubeTestState>({ status: 'idle' });
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ status: 'running' });
    try {
      setState(await runYoutubeTest());
    } finally {
      running.current = false;
    }
  }, []);

  return { state, run };
}
