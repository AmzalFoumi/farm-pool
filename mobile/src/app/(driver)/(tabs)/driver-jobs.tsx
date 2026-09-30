import { PlaceholderScreen } from "@/components/app/placeholder-screen";

/* The job board is FARM-49 (assignment) and FARM-54 (accept and deliver). Until then the tab
   exists so the shell is navigable and a new driver sees where their work will appear. */
export default function DriverJobsScreen() {
  return (
    <PlaceholderScreen
      title="Jobs"
      note="Pickup and delivery jobs will appear here once buyers' orders are ready to collect."
    />
  );
}
