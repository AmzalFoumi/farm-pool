import type { Listing, Order } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatPrice, isThisMonth } from "@/lib/format";
import type { useRequest } from "@/lib/use-request";

type Ranked = { farmerId: string; farmerName: string; earned: number; orderCount: number };

const MEDALS = ["🥇", "🥈", "🥉"] as const;

/**
 * Who's actually moving produce this month — ranked by what buyers paid on delivered orders,
 * not by listing count (posting a listing is supply; getting paid for one is the outcome that
 * matters). Reuses the orders Disputes already fetches and the listings Region already fetches —
 * no new endpoint.
 *
 * Takes Region's old map/benchmark-alert slot: a map was redundant (one coordinator, one
 * district) and the benchmark check is quiet unless something's actually wrong. This is the
 * opposite — a genuinely celebratory, always-colourful card, when there's something to celebrate.
 * Unlike `PriceOutlierAlert`, this card is always present even with nothing to show yet — a
 * permanent fixture on the page rather than something that only appears once earned, so the
 * coordinator always knows where to look once someone does.
 *
 * `success` tone, not a gold/amber one: this app's own palette already treats green as "a good
 * outcome" (`stat-card.tsx`), and the raw `harvest` ramp that would read as "gold" does not flip
 * for dark mode the way the semantic tokens do — green stays legible and on-system either way.
 * The 🏆 does the "this is a reward" work instead of the colour.
 *
 * The hero farmer pops in with a small spring (scale + fade) the first time a given farmer takes
 * the top spot — same `onboarding-slide.tsx` convention of honouring `useReducedMotion()` so
 * nothing moves for a coordinator who has asked their OS for less motion. It plays once per
 * winner, not on every re-render: `animatedFor` remembers the last farmerId it already played for,
 * so a background refetch that returns the same leader doesn't replay the reveal.
 */
export function FarmerSpotlight({
  listings,
  orders
}: {
  listings: ReturnType<typeof useRequest<Listing[]>>;
  orders: ReturnType<typeof useRequest<Order[]>>;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedFor = useRef<string | null>(null);

  const ready = listings.status === "ready" && orders.status === "ready";

  const listingCountByFarmer = new Map<string, number>();
  if (ready) {
    for (const listing of listings.data) {
      listingCountByFarmer.set(
        listing.farmerId,
        (listingCountByFarmer.get(listing.farmerId) ?? 0) + 1
      );
    }
  }

  const byFarmer = new Map<string, Ranked>();
  if (ready) {
    for (const order of orders.data) {
      if (order.status !== "delivered" || !isThisMonth(order.createdAt)) continue;
      const existing = byFarmer.get(order.farmerId);
      if (existing) {
        existing.earned += order.total;
        existing.orderCount += 1;
      } else {
        byFarmer.set(order.farmerId, {
          farmerId: order.farmerId,
          farmerName: order.farmerName,
          earned: order.total,
          orderCount: 1
        });
      }
    }
  }

  const ranked = [...byFarmer.values()].sort((a, b) => b.earned - a.earned);
  const leaderId = ranked[0]?.farmerId;

  useEffect(() => {
    if (!leaderId || animatedFor.current === leaderId) return;
    animatedFor.current = leaderId;
    progress.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) {
      progress.value = withSpring(1, { damping: 14, stiffness: 160 });
    }
  }, [leaderId, progress, reduceMotion]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
    transform: [{ scale: 0.85 + progress.value * 0.15 }]
  }));

  const card = (body: React.ReactNode) => (
    <VStack className="mx-gutter gap-3 rounded-card border border-success bg-success-subtle p-4">
      <Text className="type-h4 text-success">🏆 Farmer Spotlight · this month</Text>
      {body}
    </VStack>
  );

  if (listings.status === "loading" || orders.status === "loading") {
    return card(
      <HStack className="items-center gap-2 py-2">
        <Spinner size="small" />
        <Text className="type-body text-success">{t("coordinator.spotlight.checking")}</Text>
      </HStack>
    );
  }
  if (listings.status === "error" || orders.status === "error") {
    return card(<Text className="type-body text-success">{t("coordinator.spotlight.error")}</Text>);
  }

  if (ranked.length === 0) {
    return card(
      <Text className="type-body text-success">
        No farmer has sold anything yet this month — the spotlight lights up once an order is
        delivered.
      </Text>
    );
  }

  const [first, ...rest] = ranked;
  const runnersUp = rest.slice(0, 2);

  return (
    <VStack className="mx-gutter gap-3 rounded-card border border-success bg-success-subtle p-4">
      <Text className="type-h4 text-success">🏆 Farmer Spotlight · this month</Text>

      <Animated.View style={heroStyle}>
        <Pressable
          onPress={() => router.push(`/farmer/${first.farmerId}`)}
          accessibilityRole="button"
          accessibilityLabel={`${first.farmerName}, farmer of the month, ${formatPrice(first.earned)} earned across ${first.orderCount} ${first.orderCount === 1 ? "order" : "orders"}`}
          className="min-h-tap flex-row items-center gap-3"
        >
          <Box className="h-16 w-16 items-center justify-center rounded-pill bg-card">
            <Text className="type-h2 text-success">
              {first.farmerName.trim().charAt(0).toUpperCase() || "?"}
            </Text>
          </Box>
          <VStack className="flex-1 gap-0.5">
            <Text className="type-h4 text-foreground" numberOfLines={1}>
              {first.farmerName}
            </Text>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              {`${formatPrice(first.earned)} earned · ${first.orderCount} ${
                first.orderCount === 1 ? "order" : "orders"
              } · ${listingCountByFarmer.get(first.farmerId) ?? 0} listings`}
            </Text>
          </VStack>
        </Pressable>
      </Animated.View>

      {runnersUp.length > 0 ? (
        <VStack className="gap-2 border-t border-success pt-3">
          {runnersUp.map((farmer, i) => (
            <Pressable
              key={farmer.farmerId}
              onPress={() => router.push(`/farmer/${farmer.farmerId}`)}
              accessibilityRole="button"
              accessibilityLabel={`${farmer.farmerName}, ${formatPrice(farmer.earned)} earned this month`}
              className="min-h-tap flex-row items-center gap-2"
            >
              <Text className="type-body">{MEDALS[i + 1]}</Text>
              <Text className="type-body-bold flex-1 text-foreground" numberOfLines={1}>
                {farmer.farmerName}
              </Text>
              <Text className="type-caption text-muted-foreground">
                {formatPrice(farmer.earned)}
              </Text>
            </Pressable>
          ))}
        </VStack>
      ) : null}
    </VStack>
  );
}
