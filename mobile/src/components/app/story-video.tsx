import { useVideoPlayer, VideoView } from "expo-video";
import { useReducedMotion } from "react-native-reanimated";

import { Box } from "@/components/ui/box";

/** The bundled clip, required once at module scope so Metro resolves it at build time. */
const STORY = require("../../../assets/videos/farmpool-story.mp4");

/**
 * The FarmPool story clip, as decoration behind the welcome screen's hero.
 *
 * Muted, looping, no controls. It carries no information: everything a user needs to act on the
 * welcome screen is the wordmark, the tagline and the sheet below it, so this is hidden from
 * screen readers rather than described. A caption would be inventing meaning the clip does not
 * have.
 *
 * **Paused, on the first frame, when "reduce motion" is on.** The same rule `AnimatedWordmark`
 * follows, through the same `useReducedMotion` hook, so the two brand animations behave
 * consistently rather than each deciding for itself. The frame still shows, which is why it is
 * paused rather than unmounted — the hero keeps its composition either way.
 *
 * `supportsBackgroundPlayback` and `supportsPictureInPicture` are deliberately *not* configured
 * in `app.json`: `expo-video` needs no config plugin for inline playback, and the plugin's only
 * job is to request the native background-audio and PiP capabilities this component switches off.
 * Asking for them would widen what the app declares for no gain.
 */
type StoryVideoProps = {
  /**
   * Fill the parent completely, as an absolutely-positioned backdrop, instead of holding the
   * clip's 2:3 shape in the layout flow.
   *
   * The welcome hero needs this and it is not a detail. As a flow child the clip has to be given
   * a height, and 2:3 at full width is ~505pt on a 393pt-wide phone — far more than the hero has
   * once the wordmark and 104px of bottom padding are in it. Sized by its aspect ratio it came
   * out half-width (Yoga shrinks the height, then re-derives the width from the ratio); given
   * `flex-1` it overflowed its slot upward into the status bar. Out of the flow it can do
   * neither: it takes exactly the hero's box, `contentFit="cover"` crops to whatever shape that
   * is, and the hero stays free to shrink before the sheet moves.
   */
  fill?: boolean;
};

export function StoryVideo({ fill = false }: StoryVideoProps) {
  const reduceMotion = useReducedMotion();

  const player = useVideoPlayer(STORY, (p) => {
    p.loop = true;
    /* The file has no audio track at all, but muted is set anyway: it is what stops the player
       taking the audio session from anything the user is already listening to. */
    p.muted = true;
    if (!reduceMotion) p.play();
  });

  return (
    <Box
      /* No radius when it is filling: edge to edge against the screen, a `rounded-card` corner
         would just show slivers of the hero green at the top two corners. */
      className={
        fill
          ? "absolute inset-0 overflow-hidden"
          : "aspect-[2/3] w-full overflow-hidden rounded-card"
      }
    >
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: false }}
        /* Percentages rather than a token: the box above owns the size, and VideoView needs an
           explicit extent to fill it. */
        style={{ width: "100%", height: "100%" }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </Box>
  );
}
