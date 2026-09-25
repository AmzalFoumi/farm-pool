import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/**
 * Marks a photo as a stock sample. Upload and image storage are not built yet, so every photo
 * in the wizard is a sample, and it must never read as the farmer's own harvest.
 * Place inside a photo frame; it pins to the top-left corner.
 */
export function SampleBadge() {
  return (
    <Box className="absolute left-1 top-1 rounded-chip bg-brand-deep px-1.5 py-0.5">
      <Text className="type-caption-bold text-primary-foreground">Sample</Text>
    </Box>
  );
}
