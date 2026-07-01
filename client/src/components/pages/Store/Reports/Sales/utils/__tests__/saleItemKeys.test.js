import { buildSaleItemKey } from "../saleItemKeys";

describe("buildSaleItemKey", () => {
  it("includes variant id when the sale item belongs to a variant", () => {
    expect(buildSaleItemKey({ orderId: "order-1", productName: "Wallet", variantId: "variant-1" }))
      .toBe("order-1-Wallet-variant-1");
  });

  it("keeps simple product sale keys stable without a variant id", () => {
    expect(buildSaleItemKey({ orderId: "order-1", productName: "Wallet" }))
      .toBe("order-1-Wallet-");
  });
});
