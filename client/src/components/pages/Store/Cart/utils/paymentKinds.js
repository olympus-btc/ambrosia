export const PAYMENT_KIND = {
  BTC: "btc",
  CASH: "cash",
  CARD: "card",
  DIRECT: "direct",
};

const KIND_MATCHERS = [
  { kind: PAYMENT_KIND.BTC, keywords: ["btc"] },
  { kind: PAYMENT_KIND.CASH, keywords: ["cash", "efectivo"] },
  { kind: PAYMENT_KIND.CARD, keywords: ["credit", "debit", "card"] },
];

/**
 * Classifies a payment method by its (lowercased) name into a payment kind.
 * `buildHandlePay` uses the kind to route to the matching deferred-payment modal;
 * adding a new keyword/alias only requires extending KIND_MATCHERS.
 */
export function classifyPaymentMethod(methodName = "") {
  const normalizedName = methodName.toLowerCase();
  const match = KIND_MATCHERS.find(
    ({ keywords }) => keywords.some((keyword) => normalizedName.includes(keyword)),
  );
  return match ? match.kind : PAYMENT_KIND.DIRECT;
}
