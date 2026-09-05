import {
  PRICING_MARKUP_MIN_NGN,
  PRICING_MARKUP_PERCENT,
} from "@/lib/numbers";

export type CustomerPrice = {
  providerUsd: number;
  providerNgn: number;
  platformFeeNgn: number;
  customerNgn: number;
  customerUsd: number;
  fxRate: number;
};

export function calculateCustomerPrice(
  providerUsd: number,
  fxRate: number
): CustomerPrice {
  const safeProviderUsd = Number(providerUsd);
  const safeFxRate = Number(fxRate);

  if (
    !Number.isFinite(safeProviderUsd) ||
    safeProviderUsd < 0 ||
    !Number.isFinite(safeFxRate) ||
    safeFxRate <= 0
  ) {
    throw new Error("Invalid provider price or FX rate");
  }

  const providerNgn = Math.round(safeProviderUsd * safeFxRate);

  const percentageFeeNgn = Math.round(
    providerNgn * (PRICING_MARKUP_PERCENT / 100)
  );

  const platformFeeNgn = Math.max(
    percentageFeeNgn,
    PRICING_MARKUP_MIN_NGN
  );

  const customerNgn = providerNgn + platformFeeNgn;

  return {
    providerUsd: safeProviderUsd,
    providerNgn,
    platformFeeNgn,
    customerNgn,
    customerUsd: customerNgn / safeFxRate,
    fxRate: safeFxRate,
  };
}

export function formatNgn(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
