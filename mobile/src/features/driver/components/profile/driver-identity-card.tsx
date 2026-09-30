import { DeliveryIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/** Who the driver is: avatar tile, name, phone and role, at the top of Profile. */
export function DriverIdentityCard({ name, phone }: { name: string; phone: string }) {
  return (
    <HStack className="elevation-card items-center gap-3.5 rounded-card border border-border bg-card p-4">
      <Box className="h-14 w-14 items-center justify-center rounded-pill bg-brand-deep">
        <DeliveryIcon />
      </Box>
      <VStack className="flex-1 gap-0.5">
        <Text className="type-h3 text-foreground">{name}</Text>
        <Text className="type-body text-muted-foreground">{phone}</Text>
        <Text className="type-caption-bold text-primary">Delivery partner</Text>
      </VStack>
    </HStack>
  );
}
