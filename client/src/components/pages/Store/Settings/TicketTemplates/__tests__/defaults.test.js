import { createDefaultElements, ELEMENT_TYPES_BY_TICKET_TYPE } from "@/components/pages/Store/Settings/TicketTemplates/defaults";

describe("ticket template defaults", () => {
  it("starts a Z report template with the business header, shift summary and print date", () => {
    const shiftCloseDefaultElements = createDefaultElements("SHIFT_CLOSE");

    expect(shiftCloseDefaultElements.map(({ type: elementType, value: elementValue }) => [elementType, elementValue])).toEqual([
      ["HEADER", "{{config.businessName}}"],
      ["SEPARATOR", ""],
      ["SHIFT_SUMMARY", ""],
      ["SEPARATOR", ""],
      ["TEXT", "{{print.dateTime}}"],
    ]);
  });

  it("starts a receipt template with one empty text element", () => {
    expect(createDefaultElements("RECEIPT").map(({ type: elementType, value: elementValue }) => [elementType, elementValue])).toEqual([["TEXT", ""]]);
  });

  it("keeps the sale elements out of Z report templates", () => {
    expect(ELEMENT_TYPES_BY_TICKET_TYPE.SHIFT_CLOSE).not.toEqual(expect.arrayContaining(["TABLE_ROW"]));
    expect(ELEMENT_TYPES_BY_TICKET_TYPE.SHIFT_CLOSE).toContain("SHIFT_SUMMARY");
    expect(ELEMENT_TYPES_BY_TICKET_TYPE.RECEIPT).not.toContain("SHIFT_SUMMARY");
  });
});
