/**
 * The live call. THE ONLY FILE THAT IMPORTS `react-native-agora`.
 *
 * Agora's native code exists only in the development build. Expo Go does not have it, and
 * importing this file there crashes the app. So `app/call/[id].tsx` checks `isRunningInExpoGo()`
 * and `require`s this file only when it is safe. Never import it from anywhere else.
 */

import type { CallToken } from "@farm-pool/shared";
import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, View } from "react-native";
import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
  ConnectionStateType,
  createAgoraRtcEngine,
  RtcSurfaceView,
  type IRtcEngine,
  type IRtcEngineEventHandler
} from "react-native-agora";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Phase =
  | { kind: "starting" }
  | { kind: "waiting" } // in the channel, the other person has not joined
  | { kind: "connected"; remoteUid: number }
  | { kind: "failed"; message: string };

export type AgoraCallProps = {
  /** Fetches a fresh pass from our api. */
  getToken: () => Promise<CallToken>;
  otherName: string;
  /** Ends the call for both people. */
  onHangUp: () => void;
  /** Leaves after a failed join without ending the call, so either person can try again. */
  onClose: () => void;
};

/** Agora's video view is a native view, not a UniWind-styled one, so it takes a style. */
const FILL = { flex: 1 } as const;

async function askForCameraAndMic(): Promise<boolean> {
  if (Platform.OS !== "android") return true; // iOS asks on first use, from Info.plist text
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
  ]);
  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export default function AgoraCall({ getToken, otherName, onHangUp, onClose }: AgoraCallProps) {
  const insets = useSafeAreaInsets();
  const engine = useRef<IRtcEngine | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // The latest getToken without re-running the join effect when the screen re-renders.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    let alive = true;
    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => alive && setPhase({ kind: "waiting" }),
      onUserJoined: (_c, remoteUid) => alive && setPhase({ kind: "connected", remoteUid }),
      onUserOffline: () => alive && setPhase({ kind: "waiting" }),
      onTokenPrivilegeWillExpire: () => {
        void getTokenRef.current().then((t) => engine.current?.renewToken(t.token));
      },
      onConnectionStateChanged: (_c, state, reason) => {
        if (!alive) return;
        if (reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken) {
          setPhase({ kind: "failed", message: "The call pass was rejected. Try again." });
        } else if (state === ConnectionStateType.ConnectionStateFailed) {
          setPhase({ kind: "failed", message: "Lost the connection. Check your internet." });
        }
      }
    };

    void (async () => {
      if (!(await askForCameraAndMic())) {
        if (alive) {
          setPhase({
            kind: "failed",
            message:
              "FarmPool needs the camera and microphone for a video call. Allow them in Settings."
          });
        }
        return;
      }
      let pass: CallToken;
      try {
        pass = await getTokenRef.current();
      } catch (e) {
        if (alive) {
          setPhase({ kind: "failed", message: e instanceof Error ? e.message : "Could not join" });
        }
        return;
      }
      if (!alive) return;

      const rtc = createAgoraRtcEngine();
      engine.current = rtc;
      rtc.initialize({
        appId: pass.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication
      });
      rtc.registerEventHandler(handler);
      rtc.enableVideo();
      rtc.startPreview();
      rtc.joinChannelWithUserAccount(pass.token, pass.channel, pass.account, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishCameraTrack: true,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true
      });
    })();

    return () => {
      alive = false;
      const rtc = engine.current;
      engine.current = null;
      if (rtc) {
        rtc.unregisterEventHandler(handler);
        rtc.leaveChannel();
        rtc.release();
      }
    };
  }, []);

  const toggleMute = () => {
    engine.current?.muteLocalAudioStream(!muted);
    setMuted(!muted);
  };
  const toggleCamera = () => {
    engine.current?.muteLocalVideoStream(!cameraOff);
    setCameraOff(!cameraOff);
  };

  if (phase.kind === "failed") {
    return (
      <VStack className="flex-1 items-center justify-center gap-4 bg-background p-gutter">
        <Text className="type-h4 text-center text-foreground">Could not start the call</Text>
        <Text className="type-body text-center text-muted-foreground">{phase.message}</Text>
        <AppButton label="Close" variant="outline" onPress={onClose} />
      </VStack>
    );
  }

  return (
    <View className="flex-1 bg-brand-deep">
      {phase.kind === "connected" ? (
        <RtcSurfaceView style={FILL} canvas={{ uid: phase.remoteUid }} />
      ) : (
        <VStack className="flex-1 items-center justify-center gap-2 p-gutter">
          <Text className="type-h3 text-center text-brand-deep-foreground">{otherName}</Text>
          <Text className="type-body text-center text-brand-deep-foreground">
            {phase.kind === "starting" ? "Connecting…" : `Waiting for ${otherName} to join…`}
          </Text>
        </VStack>
      )}

      {phase.kind !== "starting" && !cameraOff ? (
        <View
          className="absolute right-gutter aspect-[3/4] w-1/3 overflow-hidden rounded-card border border-border"
          style={{ top: insets.top + 16 }}
        >
          {/* uid 0 is always "my own camera". */}
          <RtcSurfaceView style={FILL} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      ) : null}

      <HStack
        className="absolute inset-x-0 bottom-0 justify-center gap-3 px-gutter"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <CallControl label={muted ? "Unmute" : "Mute"} onPress={toggleMute} />
        <CallControl label={cameraOff ? "Camera on" : "Camera off"} onPress={toggleCamera} />
        <CallControl label="Hang up" onPress={onHangUp} destructive />
      </HStack>
    </View>
  );
}

function CallControl({
  label,
  onPress,
  destructive = false
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-tap flex-1 items-center justify-center rounded-pill px-3 ${
        destructive ? "bg-destructive" : "bg-card"
      }`}
    >
      <Text
        className={`type-body-bold ${destructive ? "text-destructive-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
