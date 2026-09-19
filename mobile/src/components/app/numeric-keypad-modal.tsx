import { useEffect, useState } from "react";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { HStack } from "@/components/ui/hstack";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

type NumericKeypadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValue: number | string;
  unitLabel?: string;
  presets?: number[];
  onConfirm: (value: number) => void;
};

export function NumericKeypadModal({
  isOpen,
  onClose,
  title,
  initialValue,
  unitLabel = "",
  presets = [50, 100, 250, 500],
  onConfirm
}: NumericKeypadModalProps) {
  const [inputValue, setInputValue] = useState<string>(String(initialValue ?? "0"));

  useEffect(() => {
    if (isOpen) {
      setInputValue(String(initialValue ?? "0"));
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    const parsed = parseInt(inputValue.replace(/[^0-9]/g, ""), 10);
    const finalVal = isNaN(parsed) ? 0 : parsed;
    onConfirm(finalVal);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="bg-card p-4 rounded-card">
        <ModalHeader>
          <Text className="type-h3 text-foreground">{title}</Text>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody className="gap-4 pt-2">
          <AppTextField
            label={unitLabel ? `Value (${unitLabel})` : "Enter Value"}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="numeric"
            placeholder="0"
          />

          {presets.length > 0 && (
            <HStack className="flex-wrap gap-2">
              {presets.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setInputValue(String(preset))}
                  accessibilityRole="button"
                  className="min-h-tap flex-1 items-center justify-center rounded-chip border border-border bg-background p-2"
                >
                  <Text className="type-body-sm-bold text-foreground">{preset}</Text>
                </Pressable>
              ))}
            </HStack>
          )}

          <AppButton label="Confirm Value" onPress={handleConfirm} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
