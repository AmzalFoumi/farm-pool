import { PlaceholderScreen } from "@/components/app/placeholder-screen";
import { useTranslation } from "react-i18next";

export default function MapScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t("buyer.map.title")} note={t("buyer.map.note")} />;
}
