/** No dispute system exists yet — not even the entity shape is decided (`.plans/PRODUCT.md`'s own
 *  open questions: "how far coordinator authority over a dispute goes" is unanswered). */

import { View } from "react-native";

import { EmptyNote } from "@/components/app/request-view";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";

export default function DisputesScreen() {
  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader title="Disputes" />
      <EmptyNote
        title="Disputes"
        note="Dispute handling isn't built yet. Check back once it ships."
      />
    </View>
  );
}
