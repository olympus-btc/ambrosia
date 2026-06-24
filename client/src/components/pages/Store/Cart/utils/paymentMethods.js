export const PAYMENT_METHODS = {
  BTC: "btc",
  CASH: "cash",
  CARD: "card",
};

const METHOD_MATCHERS = [
  { method: PAYMENT_METHODS.BTC, keywords: ["btc"] },
  { method: PAYMENT_METHODS.CASH, keywords: ["cash", "efectivo"] },
  { method: PAYMENT_METHODS.CARD, keywords: ["credit", "debit", "card"] },
];

export function classifyPaymentMethod(methodName = "") {
  const normalizedName = methodName.toLowerCase();
  const match = METHOD_MATCHERS.find(
    ({ keywords }) => keywords.some((keyword) => normalizedName.includes(keyword)),
  );
  return match ? match.method : null;
}
