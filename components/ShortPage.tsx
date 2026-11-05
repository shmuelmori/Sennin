import { type ComponentType, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebViewProps } from 'react-native-webview';
import YoutubeIframe, { PLAYER_STATES, type YoutubeIframeProps } from 'react-native-youtube-iframe';

import type { Size } from '@/lib/feedPaging';
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
  pageSize: Size;
  playerSize: Size;
  /** Mount a player. True only for the current video and its neighbors. */
  mountPlayer: boolean;
  /** Play the video. True only for the current video. */
  playing: boolean;
  onPlayerError: (videoId: string, error: string) => void;
  /** Called each time the video starts or resumes playing. */
  onPlaying: (videoId: string) => void;
};

// One full-screen page of the feed. Off-window pages render an empty page,
// so the list never holds more than three players.
export const ShortPage = memo(function ShortPage({
  videoId,
  pageSize,
  playerSize,
  mountPlayer,
  playing,
  onPlayerError,
  onPlaying,
}: Props) {
  return (
    <View style={[styles.page, pageSize]}>
      {mountPlayer ? (
        <YoutubePlayer
          videoId={videoId}
          width={playerSize.width}
          height={playerSize.height}
          play={playing}
          useLocalHTML
          baseUrlOverride={PLAYER_BASE_URL}
          webViewProps={WEB_VIEW_PROPS}
          onError={(error) => onPlayerError(videoId, error)}
          onChangeState={(state) => {
            if (state === PLAYER_STATES.PLAYING) onPlaying(videoId);
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.deepSeaNight,
  },
});
