import type { CropPriceContext } from "@farm-pool/shared";

import { formatPrice } from "@/lib/format";

export type BenchmarkComparison = {
  tone: "success" | "warning" | "info" | "muted";
  message: string;
  /** True when the price sits outside the published current range. The coordinator's own rule is
   *  not to approve a listing priced outside the benchmark they set, so this is the one signal
   *  both the review screen's approve confirmation and Region's "Priced outside benchmark" list
   *  key off — kept in one place so the two can never drift on what counts as "outside". */
  outsideRange: boolean;
};

/** Where a listing's price sits against its crop's published benchmark, if one exists. Falls back
 *  to what other farmers are actively asking when no benchmark has been set yet — read-only
 *  context either way, never a number this helper invents. */
export function compareToBenchmark(
  cropName: string,
  pricePerKg: number,
  context: CropPriceContext | undefined
): BenchmarkComparison {
  const current = context?.current;

  if (!current) {
    if (context?.activeListingRange) {
      const { lowPricePerKg, highPricePerKg, listingCount } = context.activeListingRange;
      return {
        tone: "muted",
        outsideRange: false,
        message: `Other farmers are asking ${formatPrice(lowPricePerKg)}–${formatPrice(
          highPricePerKg
        )} across ${listingCount} ${listingCount === 1 ? "listing" : "listings"}.`
      };
    }
    return { tone: "muted", outsideRange: false, message: `No benchmark set for ${cropName} yet.` };
  }

  const { lowPricePerKg, highPricePerKg } = current;
  const range = `${formatPrice(lowPricePerKg)}–${formatPrice(highPricePerKg)}`;

  if (pricePerKg < lowPricePerKg) {
    return {
      tone: "info",
      outsideRange: true,
      message: `Below the ${range} benchmark for ${cropName}.`
    };
  }
  if (pricePerKg > highPricePerKg) {
    return {
      tone: "warning",
      outsideRange: true,
      message: `Above the ${range} benchmark for ${cropName}.`
    };
  }
  return {
    tone: "success",
    outsideRange: false,
    message: `Within the ${range} benchmark for ${cropName}.`
  };
}
