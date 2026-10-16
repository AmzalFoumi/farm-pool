/**
 * Disputes — read-only monitoring, not mediation (FARM-43 follow-up, confirmed directly: the
 * coordinator does not resolve anything in-app). `.plans/PRODUCT.md`'s open question on how far
 * coordinator authority over a dispute goes stays unanswered — this does not answer it, only
 * surfaces data.
 *
 * Stat tiles only for now — no order list below them. A long scrollable list previously pushed
 * content down to the tab bar's bottom edge, which on iOS 26 goes transparent there and blurs/
 * refracts whatever's underneath it ("Liquid Glass"); `coordinator-tabs.tsx` now disables that,
 * but a handful of fixed tiles never reaches that edge regardless, so it's the safer shape while
 * the list version is parked.
 */

import { ACTIVE_ORDER_STATUSES, type Order } from "@farm-pool/shared";
import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import {
  AlertCircleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  Icon,
  RemoveIcon
} from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { StatCard } from "@/features/coordination/stat-card";
import { formatPrice, isLastMonth, isThisMonth } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Period = "month" | "all";

function hasMismatch(order: Order): boolean {
  return order.collectedKg !== undefined && order.collectedKg !== order.quantityKg;
}

export default function DisputesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const orders = useRequest(() => coordinationApi.orders(token ?? ""), token ?? "");
  const [period, setPeriod] = useState<Period>("month");

  useFocusEffect(useReloadOnRefocus(orders.reload));

  return (
    <View className="flex-1 bg-background">
      <RequestView request={orders}>
        {(rows) => {
          const inPeriod = period === "month" ? rows.filter((o) => isThisMonth(o.createdAt)) : rows;

          const completedClean = inPeriod.filter(
            (o) => o.status === "delivered" && !hasMismatch(o)
          ).length;
          const completedMismatch = inPeriod.filter(
            (o) => o.status === "delivered" && hasMismatch(o)
          ).length;
          const inProgress = inPeriod.filter((o) =>
            ACTIVE_ORDER_STATUSES.includes(o.status)
          ).length;
          const fellThrough = inPeriod.filter(
            (o) => o.status === "cancelled" || o.status === "declined"
          ).length;
          const earned = inPeriod
            .filter((o) => o.status === "delivered")
            .reduce((sum, o) => sum + o.total, 0);

          /* Compared against last month, not against "all time": "vs last month" only means
           *  something while viewing "This month" — on "All time" there is no single prior
           *  period to compare against, so the line doesn't render there at all. Within "This
           *  month" it always renders something, though: a real percentage when there's a
           *  baseline to divide by, otherwise a plain "can't compare" line rather than silently
           *  disappearing or showing a meaningless "+∞%". */
          const lastMonthEarned = rows
            .filter((o) => o.status === "delivered" && isLastMonth(o.createdAt))
            .reduce((sum, o) => sum + o.total, 0);
          const trend =
            lastMonthEarned > 0
              ? Math.round(((earned - lastMonthEarned) / lastMonthEarned) * 100)
              : null;

          return (
            <ScrollView
              contentContainerClassName="gap-3 pb-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            >
              <CoordinatorHeader title="Disputes" />

              <HStack className="mx-gutter gap-2">
                {(["month", "all"] as const).map((id) => {
                  const selected = period === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setPeriod(id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={id === "month" ? "This month" : "All time"}
                      className={[
                        "min-h-tap flex-row items-center justify-center gap-1.5 rounded-chip border px-4",
                        selected ? "border-primary bg-primary" : "border-border bg-card"
                      ].join(" ")}
                    >
                      {id === "month" ? (
                        <Icon
                          as={CalendarDaysIcon}
                          className={selected ? "text-primary-foreground" : "text-foreground"}
                          size="sm"
                        />
                      ) : null}
                      <Text
                        className={`type-body-sm-bold ${
                          selected ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {id === "month" ? "This month" : "All time"}
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>

              <VStack className="mx-gutter gap-3 px-gutter">
                <VStack className="gap-1">
                  <HStack>
                    <StatCard
                      tone="success"
                      value={formatPrice(earned)}
                      label="earned by farmers"
                    />
                  </HStack>
                  {period === "month" ? (
                    trend !== null ? (
                      <Text
                        className={
                          trend >= 0
                            ? "type-caption-bold pl-1 text-success"
                            : "type-caption-bold pl-1 text-destructive"
                        }
                      >
                        {`${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% vs last month`}
                      </Text>
                    ) : (
                      <Text className="type-caption pl-1 text-muted-foreground">
                        Can’t compare — nothing earned last month
                      </Text>
                    )
                  ) : null}
                </VStack>
                <HStack className="gap-3">
                  <StatCard
                    tone="success"
                    value={completedClean}
                    label="completed cleanly"
                    icon={<Icon as={CheckCircleIcon} className="text-success" size="md" />}
                  />
                  <StatCard
                    tone="warning"
                    value={completedMismatch}
                    label="completed with a mismatch"
                    icon={<Icon as={AlertCircleIcon} className="text-warning" size="md" />}
                    zeroLabel="No mismatches"
                  />
                </HStack>
                <HStack className="gap-3">
                  <StatCard
                    tone="info"
                    value={inProgress}
                    label="still in progress"
                    icon={<Icon as={ClockIcon} className="text-info" size="md" />}
                  />
                  <StatCard
                    tone="destructive"
                    value={fellThrough}
                    label="did not go through"
                    icon={<Icon as={RemoveIcon} className="text-destructive" size="md" />}
                    zeroLabel="All completed"
                  />
                </HStack>
              </VStack>
            </ScrollView>
          );
        }}
      </RequestView>
    </View>
  );
}
