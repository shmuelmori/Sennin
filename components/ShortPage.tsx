import { type ComponentType, memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebViewProps } from 'react-native-webview';
import YoutubeIframe, {
  PLAYER_STATES,
  type YoutubeIframeProps,
  type YoutubeIframeRef,
} from 'react-native-youtube-iframe';

import { ShortInfo } from '@/components/ShortInfo';
import type { FeedPageLayout, Size } from '@/lib/feedPaging';
import { colors } from '@/theme';

// The library types its component as React.VFC, which React 19's types no
// longer have, so TypeScript sees it as `any`. Restore its own prop types.
const YoutubePlayer = YoutubeIframe as ComponentType<YoutubeIframeProps>;

// By default the library loads its player page from github.io. useLocalHTML
// builds that page inside the app instead, so every request goes to YouTube
// (CLAUDE.md). The base URL is never requested: it only gives the page an
// origin, so YouTube's embed gets a Referer and doesn't refuse to play.
const PLAYER_BASE_URL = 'https://sennin.local/';

// The library's page sizes the player as a 16:9 box. Stretch it to fill the
// WebView so a vertical Short uses the whole 9:16 area. The player's own
// controls and branding stay inside it, fully visible.
const FILL_WEBVIEW_CSS =
  'html,body{height:100%;margin:0}' +
  '.container{height:100%!important;padding-bottom:0!important}' +
  '#player{position:absolute;top:0;left:0;width:100%!important;height:100%!important}';

const FILL_WEBVIEW_JS =
  "(function(){var s=document.createElement('style');" +
  `s.textContent='${FILL_WEBVIEW_CSS}';` +
  'document.head.appendChild(s);})();';

// On Android, react-native-webview delivers the app's commands (play, pause)
// as a 'message' event on `document`, but the library's page listens on
// `window`, so the commands never arrive. Forward them to `window`. It runs
// both before and after the page loads, in case the early run is too soon;
// the flag keeps it from forwarding twice.
const FORWARD_MESSAGES_JS =
  'if(!window.__senninForward){window.__senninForward=true;' +
  "document.addEventListener('message',function(e){" +
  "window.dispatchEvent(new MessageEvent('message',{data:e.data}));});}";

const WEB_VIEW_PROPS: WebViewProps = {
  injectedJavaScriptBeforeContentLoaded: `${FORWARD_MESSAGES_JS}true;`,
  injectedJavaScript: `${FORWARD_MESSAGES_JS}${FILL_WEBVIEW_JS}true;`,
};

type Props = {
  videoId: string;
  channelTitle: string;
  title: string;
  pageSize: Size;
  layout: FeedPageLayout;
  /** Space kept free at the bottom for the system navigation bar. */
  bottomInset: number;
  /** Mount a player. True only for the current video and its neighbors. */
  mountPlayer: boolean;
  /** Play the video. True only for the current video while the Feed is on screen. */
  playing: boolean;
  onPlayerError: (videoId: string, error: string) => void;
  /** Called each time the video starts or resumes playing. */
  onPlaying: (videoId: string) => void;
};

// One full-screen page of the feed: the player at the top and the channel
// name and title below it (§4). Off-window pages render no player, so the
// list never holds more than three. Pausing is left to the player's own
// controls; nothing here covers the player.
export const ShortPage = memo(function ShortPage({
  videoId,
  channelTitle,
  title,
  pageSize,
  layout,
  bottomInset,
  mountPlayer,
  playing,
  onPlayerError,
  onPlaying,
}: Props) {
  const playerRef = useRef<YoutubeIframeRef | null>(null);

  const onChangeState = (state: PLAYER_STATES) => {
    if (state === PLAYER_STATES.PLAYING) onPlaying(videoId);
    // Loop like the Shorts app (§4). Seeking from the ended state plays again.
    if (state === PLAYER_STATES.ENDED) playerRef.current?.seekTo(0, true);
  };

  return (
    <View style={[styles.page, pageSize]}>
      <View style={[styles.playerBox, layout.player]}>
        {mountPlayer ? (
          <YoutubePlayer
            ref={playerRef}
            videoId={videoId}
            width={layout.player.width}
            height={layout.player.height}
            play={playing}
            useLocalHTML
            baseUrlOverride={PLAYER_BASE_URL}
            webViewProps={WEB_VIEW_PROPS}
            onError={(error) => onPlayerError(videoId, error)}
            onChangeState={onChangeState}
          />
        ) : null}
      </View>
      <ShortInfo
        channelTitle={channelTitle}
        title={title}
        height={layout.infoHeight}
        bottomInset={bottomInset}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: colors.deepSeaNight,
  },
  playerBox: {
    backgroundColor: colors.deepSeaNight,
  },
});
