export const PAYMENT_METHODS = {
  BTC: "btc",
  CASH: "cash",
  CARD: "card",
  TRANSFER: "transfer",
};

const METHOD_MATCHERS = [
  { method: PAYMENT_METHODS.BTC, keywords: ["btc"] },
  { method: PAYMENT_METHODS.TRANSFER, keywords: ["transfer", "transferencia", "wire", /\bach\b/] },
  { method: PAYMENT_METHODS.CASH, keywords: ["cash", "efectivo"] },
  { method: PAYMENT_METHODS.CARD, keywords: ["credit", "debit", "card"] },
];

function keywordMatches(normalizedName, keyword) {
  return keyword instanceof RegExp ? keyword.test(normalizedName) : normalizedName.includes(keyword);
}

export function classifyPaymentMethod(methodName = "") {
  const normalizedName = methodName.toLowerCase();
  const match = METHOD_MATCHERS.find(
    ({ keywords }) => keywords.some((keyword) => keywordMatches(normalizedName, keyword)),
  );
  return match ? match.method : null;
}
