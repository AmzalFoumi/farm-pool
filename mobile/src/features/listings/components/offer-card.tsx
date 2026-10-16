import type { SenderType } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { View, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Card } from "@/components/ui/card";
import {
  CheckCircleIcon,
  DotsIcon,
  EditIcon,
  MailIcon,
  HourglassIcon
} from "@/components/app/icons";
import { Spinner } from "@/components/ui/spinner";

export type OfferStatus = "new" | "negotiating" | "confirmed" | "history";

function SpinningHourglass() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <HourglassIcon color="#64748b" size={16} />
    </Animated.View>
  );
}

export type Offer = {
  id: string;
  status: OfferStatus;
  /** Which side is looking at the card. Wording and whose turn it is follow this. */
  viewer: SenderType;
  isMyTurn?: boolean;
  /** The other side of the deal: the buyer for a farmer, the farmer for a buyer. */
  counterparty: {
    name: string;
    initials: string;
    subtitle: string;
  };
  rate: number;
  quantityKg: number;
  total: number;

  // Specific payload values for UI depending on type
  expiresIn?: string;
  round?: string;
  theirCounter?: number;
  yourCounter?: number;
  latestMessage?: string;
  timeAgo?: string;
  contractId?: string;
};

export function OfferCard({
  offer,
  onNegotiate,
  onViewHistory,
  onAccept,
  onDecline
}: {
  offer: Offer;
  onNegotiate?: () => void;
  onViewHistory?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const { t } = useTranslation();
  const other = offer.viewer === "FARMER" ? t("party.buyer") : t("party.farmer");
  if (offer.status === "new") {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-info-subtle px-2.5 py-1">
            <View className="w-2 h-2 rounded-full bg-info" />
            <Text className="text-[11px] font-bold text-info tracking-wide">
              {t("listings.offerCard.newOffer")}
            </Text>
          </View>
          {offer.expiresIn && (
            <Text className="text-[11px] font-semibold text-destructive">
              Expires in {offer.expiresIn}
            </Text>
          )}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-brand-deep items-center justify-center">
              <Text className="font-bold text-brand-deep-foreground">
                {offer.counterparty.initials}
              </Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.counterparty.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.counterparty.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">
              {t("listings.offerCard.offeredRate")}
            </Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-primary">Rs. {offer.rate}</Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">
              {t("listings.offerCard.grossTotal")}
            </Text>
            <Text className="mt-0.5 text-[16px] font-bold text-foreground">
              Rs. {offer.total.toLocaleString()}
            </Text>
          </VStack>
        </HStack>

        <VStack className="gap-2 pt-1">
          <Pressable
            onPress={onAccept}
            className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 active:scale-95"
          >
            <View className="text-primary-foreground">
              <CheckCircleIcon />
            </View>
            <Text className="text-[13px] font-bold text-primary-foreground">
              Accept Rs. {offer.rate}/kg
            </Text>
          </Pressable>

          <HStack className="gap-2 w-full">
            <Pressable
              onPress={onNegotiate}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95"
            >
              <View className="text-foreground">
                <EditIcon />
              </View>
              <Text className="text-[12px] font-bold text-foreground">
                {t("listings.offerCard.negotiate")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onDecline}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-destructive-subtle px-3 py-2.5 active:scale-95"
            >
              <Text className="text-[12px] font-bold text-destructive">{t("common.decline")}</Text>
            </Pressable>
          </HStack>
        </VStack>
      </Card>
    );
  }

  if (offer.status === "negotiating" && offer.isMyTurn) {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-warning-subtle px-2.5 py-1">
            <Text className="text-[11px] font-bold text-warning tracking-wide">
              {t("listings.offerCard.yourTurn")}
            </Text>
          </View>
          {offer.round && <Text className="text-[11px] text-muted-foreground">{offer.round}</Text>}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
              <Text className="font-bold text-foreground">{offer.counterparty.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.counterparty.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.counterparty.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">{other} Countered</Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-foreground">
                Rs. {offer.theirCounter}
              </Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">
              {t("listings.offerCard.previousCounter")}
            </Text>
            <Text className="mt-0.5 text-[14px] font-bold text-muted-foreground">
              Rs. {offer.yourCounter}/kg
            </Text>
          </VStack>
        </HStack>

        {offer.latestMessage && (
          <View className="rounded-xl bg-background p-3 shadow-sm border border-border">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("listings.offerCard.latestMessage")}
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-foreground">
              “{offer.latestMessage}”
            </Text>
          </View>
        )}

        <Pressable
          onPress={onViewHistory}
          className="flex-row items-center justify-center rounded-xl bg-brand-deep/10 px-3 py-2.5 active:scale-95"
        >
          <Text className="text-[12px] font-bold text-brand-deep">
            {t("listings.offerCard.viewFullHistory")}
          </Text>
        </Pressable>

        <HStack className="gap-2 pt-1">
          <Pressable
            onPress={onAccept}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-primary px-2 py-2.5 active:scale-95"
          >
            <Text className="text-[12px] font-bold text-primary-foreground">
              {t("common.accept")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onNegotiate}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-2 py-2.5 active:scale-95"
          >
            <Text className="text-[12px] font-bold text-foreground">
              {t("listings.offerCard.negotiate")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-destructive-subtle px-2 py-2.5 active:scale-95"
          >
            <Text className="text-[12px] font-bold text-destructive">{t("common.decline")}</Text>
          </Pressable>
        </HStack>
      </Card>
    );
  }

  if (offer.status === "negotiating" && !offer.isMyTurn) {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
            <Text className="text-[11px] font-bold text-foreground tracking-wide">
              Waiting for {other}
            </Text>
          </View>
          {offer.timeAgo && (
            <Text className="text-[11px] text-muted-foreground">{offer.timeAgo}</Text>
          )}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
              <Text className="font-bold text-foreground">{offer.counterparty.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.counterparty.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.counterparty.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">
              {t("listings.offerCard.yourCounter")}
            </Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-primary">Rs. {offer.yourCounter}</Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">
              {t("listings.offerCard.payout")}
            </Text>
            <Text className="mt-0.5 text-[16px] font-bold text-foreground">
              Rs. {offer.total.toLocaleString()}
            </Text>
          </VStack>
        </HStack>

        <View className="pt-2 gap-3">
          <View className="flex-row items-center justify-center gap-2 rounded-xl bg-muted py-3 opacity-70">
            <SpinningHourglass />
            <Text className="text-[13px] font-semibold text-muted-foreground">
              Waiting for the {other.toLowerCase()} to accept or counter…
            </Text>
          </View>

          <HStack className="gap-2">
            <Pressable
              onPress={onViewHistory}
              className="flex-[3] flex-row items-center justify-center rounded-xl bg-brand-deep px-3 py-2.5 active:scale-95"
            >
              <Text className="text-[13px] font-bold text-brand-deep-foreground">
                {t("listings.offerCard.viewNegotiation")}
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-11 items-center justify-center rounded-xl bg-muted active:scale-95">
              <View className="text-foreground">
                <DotsIcon />
              </View>
            </Pressable>
          </HStack>
        </View>
      </Card>
    );
  }

  if (offer.status === "confirmed") {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1">
            <Text className="text-[11px] font-bold text-success tracking-wide">
              {t("listings.offerCard.contractConfirmed")}
            </Text>
          </View>
          {offer.contractId && (
            <Text className="text-[11px] text-muted-foreground">#{offer.contractId}</Text>
          )}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-brand-deep items-center justify-center">
              <Text className="font-bold text-brand-deep-foreground">
                {offer.counterparty.initials}
              </Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.counterparty.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.counterparty.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <View className="rounded-xl bg-muted p-3">
          <HStack className="justify-between">
            <VStack>
              <Text className="text-[11px] font-medium text-muted-foreground">
                {t("listings.offerCard.agreedRate")}
              </Text>
              <HStack className="items-baseline gap-1 mt-0.5">
                <Text className="text-[20px] font-bold text-primary">Rs. {offer.rate}</Text>
                <Text className="text-[12px] text-muted-foreground">/ kg</Text>
              </HStack>
            </VStack>
            <VStack className="items-end">
              <Text className="text-[11px] font-medium text-muted-foreground">
                {t("listings.offerCard.securedAmount")}
              </Text>
              <Text className="mt-0.5 text-[16px] font-bold text-foreground">
                Rs. {offer.total.toLocaleString()}
              </Text>
            </VStack>
          </HStack>
        </View>

        <VStack className="pt-1 gap-2">
          <Pressable className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-brand-deep px-3 py-2.5 active:scale-95">
            <Text className="text-[13px] font-bold text-brand-deep-foreground">
              {t("listings.offerCard.viewContract")}
            </Text>
          </Pressable>
          <HStack className="gap-2">
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95">
              <Text className="text-[12px] font-bold text-foreground">
                {t("listings.offerCard.pickupDetails")}
              </Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95">
              <View className="text-foreground">
                <DotsIcon />
              </View>
              <Text className="text-[12px] font-bold text-foreground">{t("common.more")}</Text>
            </Pressable>
          </HStack>
        </VStack>
      </Card>
    );
  }

  // history (declined/expired)
  return (
    <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
      <HStack className="items-center justify-between gap-3">
        <View className="flex-row items-center gap-1.5 rounded-full bg-destructive-subtle px-2.5 py-1">
          <Text className="text-[11px] font-bold text-destructive tracking-wide">
            {t("listings.offerCard.offerDeclined")}
          </Text>
        </View>
        {offer.timeAgo && (
          <Text className="text-[11px] text-muted-foreground">{offer.timeAgo}</Text>
        )}
      </HStack>

      <HStack className="items-center gap-2.5">
        <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
          <Text className="font-bold text-foreground">{offer.counterparty.initials}</Text>
        </View>
        <VStack className="min-w-0">
          <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
            {offer.counterparty.name}
          </Text>
          <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
            {offer.counterparty.subtitle}
          </Text>
        </VStack>
      </HStack>

      <HStack className="items-center justify-between rounded-xl bg-muted p-3">
        <VStack>
          <Text className="text-[11px] font-medium text-muted-foreground">
            {t("listings.offerCard.lastOffer")}
          </Text>
          <Text className="mt-0.5 text-[19px] font-bold text-foreground">Rs. {offer.rate}/kg</Text>
        </VStack>
        <VStack className="items-end">
          <Text className="text-[11px] font-medium text-muted-foreground">
            {t("listings.offerCard.quantity")}
          </Text>
          <Text className="mt-0.5 text-[14px] font-bold text-foreground">
            {offer.quantityKg} kg
          </Text>
        </VStack>
      </HStack>

      <Text className="text-[12px] leading-5 text-muted-foreground">
        {offer.viewer === "FARMER"
          ? t("listings.offerCard.inactiveFarmer")
          : t("listings.offerCard.inactiveBuyer")}
      </Text>

      <HStack className="gap-2 pt-1">
        <Pressable
          onPress={onViewHistory}
          className="flex-1 rounded-xl bg-muted px-3 py-2.5 items-center justify-center active:scale-95"
        >
          <Text className="text-[12px] font-bold text-foreground">
            {t("listings.offerCard.viewHistory")}
          </Text>
        </Pressable>
        <Pressable className="flex-1 rounded-xl bg-brand-deep px-3 py-2.5 items-center justify-center active:scale-95">
          <Text className="text-[12px] font-bold text-brand-deep-foreground">
            {t("listings.offerCard.viewOtherOffers")}
          </Text>
        </Pressable>
      </HStack>
    </Card>
  );
}
