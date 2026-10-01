import { useTranslation } from "react-i18next";

import { DownloadIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { DocumentRow } from "./document-row";
import { NoteCard } from "./note-card";
import { StepHeading } from "./onboarding-shell";

/** Which documents a driver photographs, in the order the design lists them. */
export const DRIVER_DOCUMENTS = [
  { id: "licence", titleKey: "licence", noteKey: "licenceNote" },
  { id: "nationalId", titleKey: "nationalId", noteKey: "nationalIdNote" }
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
  const { t } = useTranslation();
  return (
    <VStack className="gap-5">
      <StepHeading
        title={t("driverSignUp.documents.title")}
        note={t("driverSignUp.documents.note")}
      />

      <VStack className="gap-2.5">
        {DRIVER_DOCUMENTS.map((doc) => (
          <DocumentRow
            key={doc.id}
            title={t(`driverSignUp.documents.${doc.titleKey}`)}
            note={t(`driverSignUp.documents.${doc.noteKey}`)}
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

      <NoteCard icon={DownloadIcon}>{t("driverSignUp.documents.offline")}</NoteCard>
    </VStack>
  );
}
