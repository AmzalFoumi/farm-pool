import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

export default function FarmerAddTabRoute() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace("/(farmer)/create-listing/create");
    }, [router])
  );

  return <View className="flex-1 bg-background" />;
}
