import { Tabs } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

export default function FarmerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: "bottom",
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          elevation: 12,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6
        },
        tabBarActiveTintColor: "#166534",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600"
        }
      }}
    >
      <Tabs.Screen
        name="farmer-home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Text className="text-xl" style={{ color }}>
              {focused ? "🏠" : "🏚️"}
            </Text>
          )
        }}
      />

      <Tabs.Screen
        name="farmer-listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color, focused }) => (
            <Text className="text-xl" style={{ color }}>
              {focused ? "🌿" : "🌱"}
            </Text>
          )
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary -mt-4 shadow-md border-2 border-card">
              <Text className="text-2xl text-white font-bold">+</Text>
            </View>
          )
        }}
      />

      <Tabs.Screen
        name="farmer-orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <Text className="text-xl" style={{ color }}>
              {focused ? "📦" : "📄"}
            </Text>
          )
        }}
      />

      <Tabs.Screen
        name="farmer-profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Text className="text-xl" style={{ color }}>
              {focused ? "👤" : "👤"}
            </Text>
          )
        }}
      />
    </Tabs>
  );
}
