import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

const ALERT_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ffddb8" />
</svg>`;

const CHEVRON_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 5L16 12L9 19" stroke="#80bea6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function RegionalDemandAlert() {
  return (
    <View className="bg-brand-deep p-3.5 rounded-card flex-row items-center justify-between shadow-sm overflow-hidden mb-3 gap-3">
      <HStack className="items-center gap-3 flex-1">
        <View className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center shrink-0">
          <SvgXml xml={ALERT_ICON} width={20} height={20} />
        </View>
        <VStack className="flex-1">
          <HStack className="items-center gap-1.5 flex-wrap">
            <Text className="type-caption-bold text-brand-deep-foreground">
              Regional Demand Alert
            </Text>
            <View className="bg-success px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                High
              </Text>
            </View>
          </HStack>
          <Text className="type-body-sm text-brand-deep-muted mt-0.5" numberOfLines={2}>
            Dambulla buyers offering +12% on Grade A Red Onions
          </Text>
        </VStack>
      </HStack>
      <View className="shrink-0">
        <SvgXml xml={CHEVRON_ICON} width={16} height={16} />
      </View>
    </View>
  );
}
