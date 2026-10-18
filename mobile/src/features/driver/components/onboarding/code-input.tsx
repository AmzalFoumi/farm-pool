import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

import { HStack } from "@/components/ui/hstack";

export const CODE_LENGTH = 6;

/**
 * The six-box SMS code field (Figma 196:6282 … 196:6291).
 *
 * Six separate `TextInput`s rather than one wide field, because the design draws six boxes and
 * because a driver sees instantly how many digits are left. That costs real input handling:
 *
 * - **Paste and SMS autofill deliver all six digits to one box.** `oneTimeCode` / `sms_otp`
 *   autofill puts the whole code into whichever box has focus, so every box spreads what it
 *   receives across the remaining boxes rather than keeping one character.
 * - **Backspace on an empty box moves back.** Without it, clearing a wrong digit means tapping
 *   the box first, which is the kind of fiddliness that makes a one-handed, outdoors flow fail.
 *
 * The value is owned by the caller; this component holds only the refs it needs to move focus.
 */
export function CodeInput({
  value,
  onChange,
  onComplete
}: {
  /** The code so far, 0–6 digits. */
  value: string;
  onChange: (code: string) => void;
  /** Fired once the sixth digit lands, so the keyboard can submit without a second tap. */
  onComplete?: (code: string) => void;
}) {
  const { t } = useTranslation();
  const boxes = useRef<(TextInput | null)[]>([]);

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(clean);
    if (clean.length === CODE_LENGTH) {
      boxes.current[CODE_LENGTH - 1]?.blur();
      onComplete?.(clean);
    } else {
      boxes.current[clean.length]?.focus();
    }
    return clean;
  };

  const handleChange = (index: number, text: string) => {
    const typed = text.replace(/\D/g, "");
    if (!typed) return;
    /* Everything before this box is kept, everything from it is replaced by what arrived —
       so a single digit advances one box and a pasted code fills the rest. */
    commit(value.slice(0, index) + typed);
  };

  const handleBackspace = (index: number) => {
    if (digits[index]) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    if (index === 0) return;
    onChange(value.slice(0, index - 1));
    boxes.current[index - 1]?.focus();
  };

  return (
    <HStack className="gap-2" accessibilityLabel={t("driverSignUp.code.inputLabel")}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          value={digit}
          onChangeText={(text) => handleChange(index, text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace") handleBackspace(index);
          }}
          keyboardType="number-pad"
          /* iOS reads the code straight out of the SMS; Android does the same through autofill. */
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          /* Not `maxLength={1}` — that would truncate a pasted six-digit code to its first digit
             before `handleChange` ever sees it. */
          maxLength={CODE_LENGTH}
          selectTextOnFocus
          accessibilityLabel={t("driverSignUp.code.digitLabel", { index: index + 1 })}
          className={[
            "type-h3 h-[68px] flex-1 rounded-field text-center text-foreground",
            /* An empty box is the off-white fill alone; a filled one keeps its primary border,
               because that border is what marks how far through the code the driver is. */
            digit ? "border border-primary bg-secondary" : "bg-card-muted"
          ].join(" ")}
        />
      ))}
    </HStack>
  );
}
