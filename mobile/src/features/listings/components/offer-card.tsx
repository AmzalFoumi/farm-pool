import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Card } from "@/components/ui/card";
import { CheckCircleIcon, DotsIcon, EditIcon, MailIcon } from "@/components/app/icons";

export type OfferStatus = "new" | "negotiating" | "confirmed" | "history";

export type Offer = {
  id: string;
  status: OfferStatus;
  isMyTurn?: boolean;
  buyer: {
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
  buyerCounter?: number;
  yourCounter?: number;
  latestMessage?: string;
  timeAgo?: string;
  contractId?: string;
};

export function OfferCard({ offer }: { offer: Offer }) {
  if (offer.status === "new") {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-info-subtle px-2.5 py-1">
            <View className="w-2 h-2 rounded-full bg-info" />
            <Text className="text-[11px] font-bold text-info tracking-wide">New Offer</Text>
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
              <Text className="font-bold text-brand-deep-foreground">{offer.buyer.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.buyer.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.buyer.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">Offered Rate</Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-primary">Rs. {offer.rate}</Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">Gross Total</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-foreground">
              Rs. {offer.total.toLocaleString()}
            </Text>
          </VStack>
        </HStack>

        <VStack className="gap-2 pt-1">
          <Pressable className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 active:scale-95">
            <View className="text-primary-foreground">
              <CheckCircleIcon />
            </View>
            <Text className="text-[13px] font-bold text-primary-foreground">
              Accept Rs. {offer.rate}/kg
            </Text>
          </Pressable>

          <HStack className="gap-2 w-full">
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95">
              <View className="text-foreground">
                <EditIcon />
              </View>
              <Text className="text-[12px] font-bold text-foreground">Counter</Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-destructive-subtle px-3 py-2.5 active:scale-95">
              <Text className="text-[12px] font-bold text-destructive">Decline</Text>
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
              Your Turn to Respond
            </Text>
          </View>
          {offer.round && <Text className="text-[11px] text-muted-foreground">{offer.round}</Text>}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
              <Text className="font-bold text-foreground">{offer.buyer.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.buyer.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.buyer.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">Buyer Countered</Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-foreground">
                Rs. {offer.buyerCounter}
              </Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">
              Your Previous Counter
            </Text>
            <Text className="mt-0.5 text-[14px] font-bold text-muted-foreground">
              Rs. {offer.yourCounter}/kg
            </Text>
          </VStack>
        </HStack>

        {offer.latestMessage && (
          <View className="rounded-xl bg-background p-3 shadow-sm border border-border">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Latest message
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-foreground">
              “{offer.latestMessage}”
            </Text>
          </View>
        )}

        <HStack className="gap-2 pt-1">
          <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-primary px-2 py-2.5 active:scale-95">
            <Text className="text-[12px] font-bold text-primary-foreground">Accept</Text>
          </Pressable>
          <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-2 py-2.5 active:scale-95">
            <Text className="text-[12px] font-bold text-foreground">Counter</Text>
          </Pressable>
          <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-destructive-subtle px-2 py-2.5 active:scale-95">
            <Text className="text-[12px] font-bold text-destructive">Decline</Text>
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
              Waiting for Buyer
            </Text>
          </View>
          {offer.timeAgo && (
            <Text className="text-[11px] text-muted-foreground">{offer.timeAgo}</Text>
          )}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
              <Text className="font-bold text-foreground">{offer.buyer.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.buyer.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.buyer.subtitle}
              </Text>
            </VStack>
          </HStack>
          <Pressable className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted active:scale-95">
            <MailIcon />
          </Pressable>
        </HStack>

        <HStack className="items-center justify-between rounded-xl bg-muted p-3">
          <VStack>
            <Text className="text-[11px] font-medium text-muted-foreground">Your Counter</Text>
            <HStack className="items-baseline gap-1 mt-0.5">
              <Text className="text-[20px] font-bold text-primary">Rs. {offer.yourCounter}</Text>
              <Text className="text-[12px] text-muted-foreground">/ kg</Text>
            </HStack>
          </VStack>
          <VStack className="items-end">
            <Text className="text-[11px] font-medium text-muted-foreground">Payout</Text>
            <Text className="mt-0.5 text-[16px] font-bold text-foreground">
              Rs. {offer.total.toLocaleString()}
            </Text>
          </VStack>
        </HStack>

        <View className="rounded-xl border border-border bg-card p-3">
          <Text className="text-[12px] leading-5 text-muted-foreground">
            You already sent your counter-offer. No action is needed until the buyer replies.
          </Text>
        </View>

        <HStack className="gap-2 pt-1">
          <Pressable className="flex-[3] rounded-xl bg-brand-deep px-3 py-2.5 items-center justify-center active:scale-95">
            <Text className="text-[13px] font-bold text-brand-deep-foreground">
              View Negotiation
            </Text>
          </Pressable>
          <Pressable className="flex-1 h-11 items-center justify-center rounded-xl bg-muted active:scale-95">
            <View className="text-foreground">
              <DotsIcon />
            </View>
          </Pressable>
        </HStack>
      </Card>
    );
  }

  if (offer.status === "confirmed") {
    return (
      <Card className="p-4 bg-card rounded-2xl shadow-sm gap-3">
        <HStack className="items-center justify-between gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1">
            <Text className="text-[11px] font-bold text-success tracking-wide">
              Contract Confirmed
            </Text>
          </View>
          {offer.contractId && (
            <Text className="text-[11px] text-muted-foreground">#{offer.contractId}</Text>
          )}
        </HStack>

        <HStack className="items-center justify-between gap-3">
          <HStack className="flex-1 min-w-0 items-center gap-2.5">
            <View className="h-10 w-10 shrink-0 rounded-xl bg-brand-deep items-center justify-center">
              <Text className="font-bold text-brand-deep-foreground">{offer.buyer.initials}</Text>
            </View>
            <VStack className="min-w-0">
              <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
                {offer.buyer.name}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                {offer.buyer.subtitle}
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
              <Text className="text-[11px] font-medium text-muted-foreground">Agreed Rate</Text>
              <HStack className="items-baseline gap-1 mt-0.5">
                <Text className="text-[20px] font-bold text-primary">Rs. {offer.rate}</Text>
                <Text className="text-[12px] text-muted-foreground">/ kg</Text>
              </HStack>
            </VStack>
            <VStack className="items-end">
              <Text className="text-[11px] font-medium text-muted-foreground">Secured Amount</Text>
              <Text className="mt-0.5 text-[16px] font-bold text-foreground">
                Rs. {offer.total.toLocaleString()}
              </Text>
            </VStack>
          </HStack>
        </View>

        <VStack className="pt-1 gap-2">
          <Pressable className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-brand-deep px-3 py-2.5 active:scale-95">
            <Text className="text-[13px] font-bold text-brand-deep-foreground">
              View Contract & QR
            </Text>
          </Pressable>
          <HStack className="gap-2">
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95">
              <Text className="text-[12px] font-bold text-foreground">Pickup Details</Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 active:scale-95">
              <View className="text-foreground">
                <DotsIcon />
              </View>
              <Text className="text-[12px] font-bold text-foreground">More</Text>
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
            Offer Declined
          </Text>
        </View>
        {offer.timeAgo && (
          <Text className="text-[11px] text-muted-foreground">{offer.timeAgo}</Text>
        )}
      </HStack>

      <HStack className="items-center gap-2.5">
        <View className="h-10 w-10 shrink-0 rounded-xl bg-muted items-center justify-center">
          <Text className="font-bold text-foreground">{offer.buyer.initials}</Text>
        </View>
        <VStack className="min-w-0">
          <Text className="truncate text-[14px] font-bold leading-tight text-foreground">
            {offer.buyer.name}
          </Text>
          <Text className="mt-0.5 text-[11.5px] text-muted-foreground">{offer.buyer.subtitle}</Text>
        </VStack>
      </HStack>

      <HStack className="items-center justify-between rounded-xl bg-muted p-3">
        <VStack>
          <Text className="text-[11px] font-medium text-muted-foreground">Last Offer</Text>
          <Text className="mt-0.5 text-[19px] font-bold text-foreground">Rs. {offer.rate}/kg</Text>
        </VStack>
        <VStack className="items-end">
          <Text className="text-[11px] font-medium text-muted-foreground">Quantity</Text>
          <Text className="mt-0.5 text-[14px] font-bold text-foreground">
            {offer.quantityKg} kg
          </Text>
        </VStack>
      </HStack>

      <Text className="text-[12px] leading-5 text-muted-foreground">
        This offer is no longer active. Your listing can continue receiving offers from other
        buyers.
      </Text>

      <HStack className="gap-2 pt-1">
        <Pressable className="flex-1 rounded-xl bg-muted px-3 py-2.5 items-center justify-center active:scale-95">
          <Text className="text-[12px] font-bold text-foreground">View Details</Text>
        </Pressable>
        <Pressable className="flex-1 rounded-xl bg-brand-deep px-3 py-2.5 items-center justify-center active:scale-95">
          <Text className="text-[12px] font-bold text-brand-deep-foreground">
            View Other Offers
          </Text>
        </Pressable>
      </HStack>
    </Card>
  );
}
