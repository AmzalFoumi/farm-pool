import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/app/app-button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { ApiError } from "@/lib/api";
import i18n from "@/lib/i18n";
import type { RequestState } from "@/lib/use-request";

/**
 * The loading and error states every data screen shares, so a buyer sees the same spinner and
 * the same "Try again" wherever a request fails. `children` renders once the data is in.
 */
export function RequestView<T>({
  request,
  children
}: {
  request: RequestState<T> & { reload: () => void };
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation();
  if (request.status === "loading") {
    return (
      <VStack className="flex-1 items-center justify-center p-gutter">
        <Spinner accessibilityLabel={t("common.loading")} />
      </VStack>
    );
  }
  if (request.status === "error") {
    return (
      <VStack className="flex-1 items-center justify-center gap-4 p-gutter">
        <Text className="type-h4 text-center text-foreground">{t("common.couldNotLoad")}</Text>
        <Text className="type-body text-center text-muted-foreground">
          {errorMessage(request.error, t)}
        </Text>
        <AppButton label={t("common.tryAgain")} variant="outline" onPress={request.reload} />
      </VStack>
    );
  }
  return <>{children(request.data)}</>;
}

/**
 * The api's message, in the reader's language where we have one.
 *
 * `ApiError.code` is the stable contract (`lib/api.ts`), so it is the thing worth translating;
 * `error.message` is prose the api wrote in English. Falling back to that prose rather than to a
 * generic line is deliberate — an untranslated but specific "Quantity must be between 10 and 100 kg"
 * tells a user what to change, and `t("errors.generic")` does not. The cost is one English line on
 * a Sinhala screen, which is the lesser harm and is visible to whoever adds the missing key.
 */
function errorMessage(error: ApiError, t: TFunction): string {
  const key = `errors.${error.code}`;
  return i18n.exists(key) ? t(key) : error.message;
}

/** Centred one-liner for an empty list. */
export function EmptyNote({ title, note }: { title: string; note: string }) {
  return (
    <VStack className="items-center gap-1 px-gutter py-12">
      <Text className="type-h4 text-center text-foreground">{title}</Text>
      <Text className="type-body text-center text-muted-foreground">{note}</Text>
    </VStack>
  );
}
