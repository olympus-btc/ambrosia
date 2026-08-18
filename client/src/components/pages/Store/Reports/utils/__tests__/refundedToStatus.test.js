import { refundedToStatus } from "../refundedToStatus";

describe("refundedToStatus", () => {
  it("returns refunded when the sale or order was refunded", () => {
    expect(refundedToStatus(true)).toBe("refunded");
  });

  it("returns paid when the sale or order was not refunded", () => {
    expect(refundedToStatus(false)).toBe("paid");
  });
});
