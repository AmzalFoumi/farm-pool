import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  WizardActions,
  WizardShell
} from "@/features/listings/components/create-listing/wizard-shell";

import { DISTRICTS } from "../../vehicles";
import { DistrictChip } from "./district-chip";

type Step3DistrictProps = {
  district: string | null;
  onSelect: (district: string) => void;
  error?: string;
  onBack: () => void;
  onContinue: () => void;
};

export function Step3District({
  district,
  onSelect,
  error,
  onBack,
  onContinue
}: Step3DistrictProps) {
  return (
    <WizardShell
      step={3}
      stepCount={3}
      title="Where you work"
      onBack={onBack}
      help="Pick the district you usually collect produce in. Jobs there are shown to you first."
      footer={
        <WizardActions
          onBack={onBack}
          continueLabel="Continue"
          continueDisabled={!district}
          onContinue={onContinue}
        />
      }
    >
      <VStack className="gap-1">
        <Text className="type-h2 text-foreground">Which district?</Text>
        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
      </VStack>

      <HStack className="flex-wrap gap-2" accessibilityRole="radiogroup">
        {DISTRICTS.map((name) => (
          <DistrictChip
            key={name}
            name={name}
            selected={district === name}
            onPress={() => onSelect(name)}
          />
        ))}
      </HStack>
    </WizardShell>
  );
}
