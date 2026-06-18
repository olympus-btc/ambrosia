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

export function classifyPaymentMethod(methodName = "") {
  const normalizedName = methodName.toLowerCase();
  const match = KIND_MATCHERS.find(
    ({ keywords }) => keywords.some((keyword) => normalizedName.includes(keyword)),
  );
  return match ? match.kind : PAYMENT_KIND.DIRECT;
}
