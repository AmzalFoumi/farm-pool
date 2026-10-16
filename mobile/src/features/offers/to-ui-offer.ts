import type { Offer as SharedOffer, SenderType } from "@farm-pool/shared";

import type { Offer as UiOffer, OfferStatus } from "@/features/listings/components/offer-card";

/** Which side of an offer the signed-in user is on. */
export function viewerOf(offer: SharedOffer, userId: string): SenderType {
  return offer.farmerId === userId ? "FARMER" : "BUYER";
}

/**
 * The api's offer, as the offer card shows it to one side.
 *
 * A `PENDING` offer is "new" only to the side that has to answer it. To the side that made it,
 * it is an offer they are waiting on — the card's "negotiating, not my turn" state — so the
 * person who just sent an offer is never shown Accept and Decline buttons for their own offer.
 */
export function toUiOffer(offer: SharedOffer, viewer: SenderType): UiOffer {
  // A copy, newest first: `reverse()` on the original would reorder the cached history.
  const newestFirst = [...offer.negotiationHistory].reverse();
  const other: SenderType = viewer === "FARMER" ? "BUYER" : "FARMER";
  const isMyTurn = offer.actionRequiredBy === viewer;

  let status: OfferStatus;
  if (offer.status === "ACCEPTED") status = "confirmed";
  else if (offer.status === "DECLINED" || offer.status === "EXPIRED") status = "history";
  else if (offer.status === "PENDING" && isMyTurn) status = "new";
  else status = "negotiating";

  const otherId = viewer === "FARMER" ? offer.buyerId : offer.farmerId;
  const otherLabel = viewer === "FARMER" ? "Buyer" : "Farmer";
  // Offers stored before names were recorded fall back to the last four characters of the id.
  const name =
    (viewer === "FARMER" ? offer.buyerName : offer.farmerName) ??
    `${otherLabel} ${otherId.slice(-4)}`;

  return {
    id: offer.id,
    status,
    viewer,
    isMyTurn,
    counterparty: {
      name,
      initials: name.trim().charAt(0).toUpperCase() || "?",
      subtitle: otherLabel
    },
    rate: offer.pricePerKg,
    quantityKg: offer.quantityKg,
    total: offer.total,
    contractId: offer.orderId,
    yourCounter: newestFirst.find((h) => h.senderType === viewer)?.proposedPrice,
    theirCounter: newestFirst.find((h) => h.senderType === other)?.proposedPrice,
    latestMessage: newestFirst[0]?.note
  };
}
