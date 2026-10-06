import {
  formatMinutesOfDay,
  MIN_COMMITTED_MINUTES,
  type CollectionWindow
} from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * The slot a driver promises a farmer when taking a job (FARM-61).
 *
 * **Offered as a few whole slots, not a time picker.** A driver sets this standing at a junction,
 * one-handed, often in poor light — two taps on "8:00 am – 10:00 am" is a different act from
 * spinning two wheels to the minute. It also makes the promise honest: the slots are wide enough
 * that a rural road cannot break them, which a minute-precise picker would quietly invite.
 *
 * The slots are carved out of the window the farmer actually offered, so anything shown here is by
 * construction something the api will accept. A driver should never be able to tap a time and be
 * told no.
 */
const SLOT_MINUTES = 120;

/** Whole slots inside the farmer's window, dropping any tail too short to be a real promise. */
function slotsWithin(offered: CollectionWindow): CollectionWindow[] {
  const slots: CollectionWindow[] = [];
  for (let from = offered.from; from < offered.to; from += SLOT_MINUTES) {
    const to = Math.min(from + SLOT_MINUTES, offered.to);
    if (to - from >= MIN_COMMITTED_MINUTES) {
      slots.push({ date: offered.date, from, to });
    }
  }
  return slots;
}

export function WindowPicker({
  offered,
  value,
  onChange
}: {
  /** When the farmer said they can be ready. */
  offered: CollectionWindow;
  value?: CollectionWindow;
  onChange: (window: CollectionWindow) => void;
}) {
  const { t } = useTranslation();
  const slots = slotsWithin(offered);

  /* A window too short to divide is still a promise the driver can make — offer it whole rather
     than showing an empty picker and blocking the job. */
  if (slots.length === 0) return null;

  return (
    <VStack className="gap-2">
      <VStack className="gap-0.5">
        <Text className="type-body-bold text-foreground">{t("jobs.window.title")}</Text>
        <Text className="type-caption text-muted-foreground">
          {t("jobs.window.help", { window: formatWindow(offered) })}
        </Text>
      </VStack>

      <VStack className="gap-2" accessibilityRole="radiogroup">
        {slots.map((slot) => {
          const selected = value?.from === slot.from && value?.to === slot.to;
          const label = formatWindow(slot);
          return (
            <Pressable
              key={`${slot.date}-${slot.from}`}
              onPress={() => onChange(slot)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              testID={`window-slot-${slot.from}`}
              className={`min-h-tap items-center justify-center rounded-card border px-4 py-3 ${
                selected ? "border-2 border-primary bg-secondary" : "border-border bg-card"
              }`}
            >
              <Text
                className={`type-body-bold ${
                  selected ? "text-secondary-foreground" : "text-foreground"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </VStack>

      {/* Said plainly, because it is the promise being made and not a detail: the farmer will
          harvest for this time, and the driver cannot quietly move it later. */}
      <Text className="type-caption text-muted-foreground">{t("jobs.window.promise")}</Text>
    </VStack>
  );
}

/** "6:00 am – 8:00 am". Shared with the api's refusal message wording. */
export function formatWindow(w: CollectionWindow): string {
  return `${formatMinutesOfDay(w.from)} – ${formatMinutesOfDay(w.to)}`;
}
