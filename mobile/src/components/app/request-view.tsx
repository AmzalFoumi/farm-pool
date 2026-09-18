import type { ReactNode } from "react";

import { AppButton } from "@/components/app/app-button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
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
  if (request.status === "loading") {
    return (
      <VStack className="flex-1 items-center justify-center p-gutter">
        <Spinner accessibilityLabel="Loading" />
      </VStack>
    );
  }
  if (request.status === "error") {
    return (
      <VStack className="flex-1 items-center justify-center gap-4 p-gutter">
        <Text className="type-h4 text-center text-foreground">Could not load</Text>
        <Text className="type-body text-center text-muted-foreground">{request.error.message}</Text>
        <AppButton label="Try again" variant="outline" onPress={request.reload} />
      </VStack>
    );
  }
  return <>{children(request.data)}</>;
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
