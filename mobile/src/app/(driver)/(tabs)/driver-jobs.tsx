/**
 * Jobs — the driver's board (LP-20) and the jobs they already hold, on one screen.
 *
 * Two lists rather than two tabs: a driver with three jobs in hand and one on offer should see
 * both without navigating, and the board is short by design (their district, their capacity).
 * "My jobs" comes first — work already promised outranks work on offer.
 */

import type { JobSummary } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Text } from "@/components/ui/text";
import { logisticsApi } from "@/features/logistics/api";
import { JobCard } from "@/features/logistics/job-card";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function DriverJobsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  /* One request for both lists so the two cannot disagree about a job that was just accepted —
     the board and "mine" are the same order moving between them. */
  const jobs = useRequest(
    () =>
      Promise.all([logisticsApi.mine(token ?? ""), logisticsApi.board(token ?? "")]).then(
        ([mine, board]) => ({ mine, board })
      ),
    token ?? ""
  );

  // Coming back from accepting a job moves it from the board into My jobs.
  useFocusEffect(useReloadOnRefocus(jobs.reload));

  const open = (job: JobSummary) =>
    router.push({ pathname: "/(driver)/job/[id]", params: { id: job.id } });

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("jobs.title")} />
      <RequestView request={jobs}>
        {({ mine, board }) => (
          <SectionList
            sections={[
              { title: t("jobs.mine"), data: mine, empty: t("jobs.mineEmpty") },
              { title: t("jobs.available"), data: board, empty: t("jobs.availableEmpty") }
            ]}
            keyExtractor={(job) => job.id}
            stickySectionHeadersEnabled={false}
            contentContainerClassName="gap-3 p-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderSectionHeader={({ section }) => (
              <Text className="type-body-bold pt-2 text-foreground">{section.title}</Text>
            )}
            renderSectionFooter={({ section }) =>
              section.data.length === 0 ? (
                <Text className="type-caption text-muted-foreground">{section.empty}</Text>
              ) : null
            }
            renderItem={({ item }) => <JobCard job={item} onPress={() => open(item)} />}
            ListEmptyComponent={<EmptyNote title={t("jobs.noneTitle")} note={t("jobs.noneBody")} />}
          />
        )}
      </RequestView>
    </View>
  );
}
