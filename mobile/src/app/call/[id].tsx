/**
 * "/call/:id?name=…" — joins a video call. `name` is the other person, for the waiting screen.
 *
 * Agora's native code exists only in the development build, so in Expo Go this screen explains
 * that instead of loading the call. The `require` below is deliberately lazy: a top-level import
 * would load Agora the moment the router reads this file, and crash Expo Go.
 */

import { isRunningInExpoGo } from "expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentType } from "react";
import { View } from "react-native";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { callsApi } from "@/features/calls/api";
import type { AgoraCallProps } from "@/features/calls/agora-call";
import { useAuth } from "@/providers/auth-provider";

export default function CallScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const otherName = name ?? "The other person";

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  const leave = () => {
    // Record the end, but do not keep someone on a dead screen if the api is unreachable.
    void callsApi.end(token ?? "", id).catch(() => undefined);
    goBack();
  };

  if (isRunningInExpoGo()) {
    return (
      <View className="flex-1 bg-background">
        <AppBar title="Video call" onBack={() => router.back()} />
        <VStack className="flex-1 items-center justify-center gap-4 p-gutter">
          <Text className="type-h4 text-center text-foreground">
            Video calls need the FarmPool development build
          </Text>
          <Text className="type-body text-center text-muted-foreground">
            Expo Go cannot run the video library. Every other screen works here. See
            .plans/development-build/README.md to install the development build.
          </Text>
          <AppButton label="Go back" variant="outline" onPress={() => router.back()} />
        </VStack>
      </View>
    );
  }

  // Lazy on purpose, see top.
  const AgoraCall = // eslint-disable-next-line @typescript-eslint/no-require-imports
    (
      require("@/features/calls/agora-call") as {
        default: ComponentType<AgoraCallProps>;
      }
    ).default;

  return (
    <AgoraCall
      getToken={() => callsApi.token(token ?? "", id)}
      otherName={otherName}
      onHangUp={leave}
      onClose={goBack}
    />
  );
}
