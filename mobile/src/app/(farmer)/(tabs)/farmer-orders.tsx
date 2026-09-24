import { PlaceholderScreen } from "@/components/app/placeholder-screen";

/* The api has no "orders placed against my listings" route yet: `GET /orders/mine` finds orders
   by buyer, so a farmer would always see an empty list that looks like "nobody ordered". Until
   an incoming-orders endpoint exists (its own ticket), say so plainly instead. */
export default function FarmerOrdersScreen() {
  return (
    <PlaceholderScreen
      title="Incoming orders"
      note="Orders buyers place on your listings will appear here."
    />
  );
}
