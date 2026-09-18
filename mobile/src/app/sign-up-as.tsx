/**
 * Sign up as — role picker, reached from the welcome screen.
 * Figma node 196:5575.
 *
 * The Figma frame shows "Delivery partner" already selected, because a static
 * mock has to show the selected state somewhere. A real first visit has nothing
 * selected, so that is the initial state here and the footer button is disabled
 * until a role is picked. Its label is templated — Figma's "Continue as
 * delivery partner" is that template filled in with the mock's selection.
 *
 * All four roles are offered (decided 18 September 2026 — `.plans/auth/README.md`).
 * The Figma frame predates that and draws three; the coordinator card follows
 * the same anatomy with its own persona tint. Each role's onboarding after the
 * account exists belongs to the developer owning that role — this screen and
 * `sign-up.tsx` only get the account created and the session started.
 */

import type { Role } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import {
  BuyerIcon,
  CheckIcon,
  ChevronIcon,
  DeliveryIcon,
  FarmerIcon
} from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { GlobeIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type RoleOption = {
  /** The shared `Role` this card creates. The label is what people call it. */
  id: Role;
  title: string;
  description: string;
  /** Tile colour per persona. See `src/styles/colors.css`. */
  tile: string;
  selectedLabel: string;
  Icon: (props: { size?: number }) => React.JSX.Element;
};

/** Coordinator has no Figma export; the vendored gluestack glyph is recoloured
 *  through the persona token rather than redrawn. Recorded in DECISIONS
 *  (open question 1, iconography). */
const CoordinatorIcon = () => (
  <Icon as={GlobeIcon} className="h-7 w-7 text-persona-coordinator-foreground" />
);

const ROLES: readonly RoleOption[] = [
  {
    id: "farmer",
    title: "Farmer",
    description: "I grow produce and want to sell it",
    tile: "bg-secondary",
    selectedLabel: "farmer",
    Icon: FarmerIcon
  },
  {
    id: "buyer",
    title: "Wholesale buyer",
    description: "I buy produce in bulk from farmers",
    tile: "bg-persona-buyer",
    selectedLabel: "wholesale buyer",
    Icon: BuyerIcon
  },
  {
    id: "coordinator",
    title: "Area coordinator",
    description: "I organise farmers in my area and check their produce",
    tile: "bg-persona-coordinator",
    selectedLabel: "coordinator",
    Icon: CoordinatorIcon
  },
  {
    id: "logistics",
    title: "Delivery partner",
    description: "I collect produce and drive it to buyers",
    tile: "bg-brand-deep",
    selectedLabel: "delivery partner",
    Icon: DeliveryIcon
  }
];

export default function SignUpAsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Role | null>(null);

  const selectedRole = ROLES.find((role) => role.id === selected);

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Sign up as" />

      {/* ── Roles ────────────────────────────────────────────────────── */}
      <VStack className="flex-1 px-4">
        <Text className="type-body mt-5 text-muted-foreground">
          Pick what you do. You can change it later with your coordinator.
        </Text>

        <VStack className="mt-4 gap-3" accessibilityRole="radiogroup">
          {ROLES.map(({ id, title, description, tile, Icon: RoleIcon }) => {
            const isSelected = selected === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSelected(id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${title}. ${description}`}
                className={[
                  // py-4.5 rather than p-4: with the 52px tile that lands the
                  // card at exactly the 88px Figma draws.
                  "flex-row items-center gap-3.5 rounded-card bg-card px-4 py-4.5",
                  // The selected card's 2px border grows inward, so the row
                  // shifts by 1px on selection. Figma draws exactly the same
                  // shift (tile left 16 → 15), so it is left as-is.
                  isSelected ? "border-2 border-brand-deep" : "border border-border"
                ].join(" ")}
              >
                <Box className={`h-13 w-13 items-center justify-center rounded-card ${tile}`}>
                  <RoleIcon />
                </Box>

                <VStack className="flex-1 gap-1.5">
                  <Text className="type-h4 text-foreground">{title}</Text>
                  <Text className="type-caption text-muted-foreground">{description}</Text>
                </VStack>

                {/* The affordance swaps rather than stacks: a chevron says
                    "there is more this way", a check says "this one is chosen".
                    Showing both at once would say neither clearly. */}
                {isSelected ? (
                  <Box className="h-7 w-7 items-center justify-center rounded-pill bg-brand-deep">
                    <CheckIcon />
                  </Box>
                ) : (
                  <ChevronIcon />
                )}
              </Pressable>
            );
          })}
        </VStack>
      </VStack>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View
        className="border-t border-border bg-card px-4 pt-3"
        /* Figma leaves 23px under the button. On a device with a home
           indicator the inset already covers that and more, so take whichever
           is larger rather than stacking the two. */
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton
          label={selectedRole ? `Continue as ${selectedRole.selectedLabel}` : "Continue"}
          disabled={!selectedRole}
          /* push, not replace: the back button on the form should return
             here so a wrong tap on a role is one step to undo. */
          onPress={() =>
            selectedRole && router.push({ pathname: "/sign-up", params: { role: selectedRole.id } })
          }
        />
      </View>
    </View>
  );
}
