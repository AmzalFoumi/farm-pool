import { ClockIcon, Icon, PhoneIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { CodeInput } from "./code-input";
import { StepHeading } from "./onboarding-shell";

/** `102` → `1:42`. Seconds only ever count down from one minute here, but the format holds. */
function countdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Step 2 — the SMS code (Figma 196:6269).
 *
 * "Call me the code instead" is drawn in the design and kept here: a driver with a weak data
 * connection may still take a voice call, and it is the documented fallback for anyone who
 * cannot read an SMS. It is disabled until the resend timer expires, for the same reason the
 * resend is — both would otherwise be a way to trigger unlimited messages.
 */
export function Step2Code({
  phone,
  code,
  onChangeCode,
  onComplete,
  error,
  resendIn,
  onResend,
  onVoiceCall
}: {
  /** Already normalised to E.164, shown back so a wrong number is obvious before they wait. */
  phone: string;
  code: string;
  onChangeCode: (code: string) => void;
  onComplete: (code: string) => void;
  error?: string;
  /** Seconds until a resend is allowed; `0` enables both fallbacks. */
  resendIn: number;
  onResend: () => void;
  onVoiceCall: () => void;
}) {
  const canResend = resendIn === 0;

  return (
    <VStack className="gap-5">
      <StepHeading title="Enter the code" note={`Sent by SMS to ${phone}.`} />

      <VStack className="gap-2">
        <CodeInput value={code} onChange={onChangeCode} onComplete={onComplete} />
        {error ? (
          <Text className="type-caption text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </VStack>

      <Pressable
        onPress={onResend}
        disabled={!canResend}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canResend }}
        accessibilityLabel={
          canResend ? "Send the code again" : `You can ask for a new code in ${resendIn} seconds`
        }
        className="min-h-tap flex-row items-center gap-2"
      >
        <Icon
          as={ClockIcon}
          size="sm"
          className={canResend ? "text-primary" : "text-muted-foreground"}
        />
        <Text className={`type-body ${canResend ? "text-primary" : "text-muted-foreground"}`}>
          {canResend ? "Send the code again" : `Resend in ${countdown(resendIn)}`}
        </Text>
      </Pressable>

      <Pressable
        onPress={onVoiceCall}
        disabled={!canResend}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canResend }}
        className={[
          "min-h-tap flex-row items-center justify-center gap-2 rounded-field border border-border bg-card",
          canResend ? "" : "opacity-40"
        ].join(" ")}
      >
        <Icon as={PhoneIcon} size="sm" className="text-foreground" />
        <Text className="type-body-sm-bold text-foreground">Call me the code instead</Text>
      </Pressable>
    </VStack>
  );
}

/** Where the countdown starts. Long enough that a real SMS has arrived, short enough that a
 *  driver on a bad network is not stranded — the number the design puts on screen. */
export const RESEND_SECONDS = 60;
