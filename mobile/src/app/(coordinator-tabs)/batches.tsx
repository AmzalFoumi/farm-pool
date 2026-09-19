/** Batching needs a `Batch` entity that does not exist yet — `.plans/coordination/OPEN.md` #4. */

import { View } from "react-native";

import { EmptyNote } from "@/components/app/request-view";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";

export default function BatchesScreen() {
  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader title="Batches" />
      <EmptyNote
        title="Batches"
        note="Shared-transport batching isn't built yet. Check back once it ships."
      />
    </View>
  );
}
