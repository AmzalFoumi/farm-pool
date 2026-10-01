import { CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon, PaperclipIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One document to photograph on step 4 (Figma 196:6374 / 196:6386).
 *
 * Two states in one row, as the design draws them: not yet taken shows a "Take photo" button;
 * taken swaps it for a "Done" confirmation and the subtitle becomes "Photo added". The row's
 * button is the tap target rather than the whole row, because a captured row has nothing left to
 * do and a full-row target would invite a re-take by accident.
 */
export function DocumentRow({
  title,
  note,
  captured,
  onCapture
}: {
  title: string;
  /** The hint under the title before capture, e.g. "Front side, both sides later". */
  note: string;
  captured: boolean;
  onCapture: () => void;
}) {
  return (
    <HStack className="items-center gap-3 rounded-card border border-border bg-card p-3.5">
      <Box
        className={`h-13 w-13 items-center justify-center rounded-field ${
          captured ? "bg-success-subtle" : "bg-secondary"
        }`}
      >
        <Icon
          as={PaperclipIcon}
          className={captured ? "text-success" : "text-secondary-foreground"}
        />
      </Box>

      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground">{title}</Text>
        <Text className="type-body-sm text-muted-foreground">
          {captured ? "Photo added" : note}
        </Text>
      </VStack>

      {captured ? (
        <HStack
          className="items-center gap-1.5 rounded-pill bg-success-subtle px-3 py-1.5"
          accessibilityLabel={`${title} photo added`}
        >
          <CheckIcon />
          <Text className="type-body-sm-bold text-success">Done</Text>
        </HStack>
      ) : (
        <Pressable
          onPress={onCapture}
          accessibilityRole="button"
          accessibilityLabel={`Take a photo of your ${title.toLowerCase()}`}
          className="min-h-tap items-center justify-center rounded-field bg-brand-deep px-4"
        >
          <Text className="type-body-sm-bold text-brand-deep-foreground">Take photo</Text>
        </Pressable>
      )}
    </HStack>
  );
}
