/**
 * The three driver-onboarding scenes.
 *
 * NONE OF THESE ARE THE FIGMA FRAMES ANY MORE. Figma drew each slide as a small abstract diagram
 * — two dots and a dashed line, a QR code, a crossed-out cloud — at 320x260 in the middle of the
 * panel. All three were replaced by drawn scenes of the thing the slide is about: the day's route,
 * the depot, the dead zone. A driver on this screen is deciding whether this work is worth owning
 * a vehicle for, and is better served by being shown the work than a diagram of it.
 *
 * Each scene is 1408x768 and lives in its own module, because together they are 95 KB of path
 * data and inlining them here would bury the twenty lines that actually do something. They are
 * kept out of `components/app/icons.tsx` for the same reason they always were: they are used
 * once each, and every screen in the app would otherwise pay to parse them.
 */

import { useWindowDimensions } from "react-native";
import { SvgXml } from "react-native-svg";

import { ONE_JOB_ONE_ROUTE_SCENE } from "./one-job-one-route-scene";
import { SCAN_AT_THE_DROP_SCENE } from "./scan-at-the-drop-scene";
import { WEAK_SIGNAL_SCENE } from "./weak-signal-scene";

type IllustrationProps = { width?: number };

/** All three scenes are drawn 1408 × 768. Stated once so no caller has to guess it. */
const SCENE_RATIO = 1408 / 768;

/**
 * A scene at the panel's full width, keeping its ratio.
 *
 * Sized off the window rather than measured: the panel is already full-bleed, and an onLayout
 * pass would cost a frame of blank space on the first slide of a cold start.
 */
function Scene({ xml, width }: IllustrationProps & { xml: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const drawnWidth = width ?? windowWidth;

  return <SvgXml xml={xml} width={drawnWidth} height={drawnWidth / SCENE_RATIO} />;
}

export function OneJobOneRouteArt(props: IllustrationProps) {
  return <Scene xml={ONE_JOB_ONE_ROUTE_SCENE} {...props} />;
}

export function ScanAtTheDropArt(props: IllustrationProps) {
  return <Scene xml={SCAN_AT_THE_DROP_SCENE} {...props} />;
}

export function WeakSignalArt(props: IllustrationProps) {
  return <Scene xml={WEAK_SIGNAL_SCENE} {...props} />;
}
