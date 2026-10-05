import { Offer } from "./offer-card";

export const MOCK_OFFERS: Offer[] = [
  {
    id: "1",
    status: "new",
    buyer: {
      name: "Keells Fresh Produce Direct",
      initials: "KF",
      subtitle: "Tier-1 Supermarket Partner · ⭐ 4.95"
    },
    rate: 175,
    quantityKg: 500,
    total: 87500,
    expiresIn: "3h 45m"
  },
  {
    id: "2",
    status: "negotiating",
    isMyTurn: true,
    buyer: {
      name: "Bandara Wholesale Traders",
      initials: "BW",
      subtitle: "Kurunegala Aggregator · ⭐ 4.7"
    },
    rate: 172,
    quantityKg: 500,
    total: 86000,
    round: "Round 2 of 3",
    buyerCounter: 172,
    yourCounter: 175,
    latestMessage: "Can settle via CEFT at FarmGate tomorrow morning if Rs. 172."
  },
  {
    id: "3",
    status: "negotiating",
    isMyTurn: false,
    buyer: {
      name: "Matale Vegetable Traders",
      initials: "MV",
      subtitle: "Matale Collection Point · ⭐ 4.6"
    },
    rate: 176,
    quantityKg: 500,
    total: 88000,
    timeAgo: "Sent 18m ago",
    yourCounter: 176
  },
  {
    id: "4",
    status: "confirmed",
    buyer: {
      name: "Cargills Agri-Hub",
      initials: "CA",
      subtitle: "Dambulla DEC Hub · ⭐ 4.9 · 120+ trades"
    },
    rate: 178,
    quantityKg: 500,
    total: 89000,
    contractId: "FP-8842"
  },
  {
    id: "5",
    status: "history",
    buyer: { name: "Regional Agro Buyers", initials: "RA", subtitle: "Dambulla · ⭐ 4.4" },
    rate: 160,
    quantityKg: 500,
    total: 80000,
    timeAgo: "Yesterday"
  }
];
