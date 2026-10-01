import { DownloadIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { DocumentRow } from "./document-row";
import { NoteCard } from "./note-card";
import { StepHeading } from "./onboarding-shell";

/** Which documents a driver photographs, in the order the design lists them. */
export const DRIVER_DOCUMENTS = [
  {
    id: "licence",
    title: "Driving licence",
    note: "Clear photo of the front"
  },
  {
    id: "nationalId",
    title: "National ID card",
    note: "Front side, both sides later"
  }
] as const;

export type DocumentId = (typeof DRIVER_DOCUMENTS)[number]["id"];

/** Step 4 — the two photos that go to the coordinator (Figma 196:6361). */
export function Step4Documents({
  captured,
  onCapture,
  error
}: {
  captured: Record<DocumentId, string | null>;
  onCapture: (id: DocumentId) => void;
  error?: string;
}) {
  return (
    <VStack className="gap-5">
      <StepHeading title="Two photos" note="Take a clear photo of each. No typing needed." />

      <VStack className="gap-2.5">
        {DRIVER_DOCUMENTS.map((doc) => (
          <DocumentRow
            key={doc.id}
            title={doc.title}
            note={doc.note}
            captured={captured[doc.id] !== null}
            onCapture={() => onCapture(doc.id)}
          />
        ))}
        {error ? (
          <Text className="type-caption text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </VStack>

      <NoteCard icon={DownloadIcon}>
        No signal? The photos stay on your phone and upload when you get network.
      </NoteCard>
    </VStack>
  );
}
