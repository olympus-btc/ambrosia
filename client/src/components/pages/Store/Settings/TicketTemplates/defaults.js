export const DEFAULT_STYLE = {
  bold: false,
  justification: "LEFT",
  fontSize: "NORMAL",
};

export function createElement(type = "TEXT", value = "", style = DEFAULT_STYLE) {
  return {
    localId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    value,
    style,
  };
}

export const TICKET_TYPES = ["RECEIPT", "SHIFT_CLOSE"];

export const DEFAULT_TICKET_TYPE = "RECEIPT";

export const ELEMENT_TYPES_BY_TICKET_TYPE = {
  RECEIPT: ["HEADER", "TEXT", "LINE_BREAK", "SEPARATOR", "TABLE_HEADER", "TABLE_ROW", "TOTAL_ROW", "PAYMENT_METHOD", "FOOTER", "QRCODE", "LOGO"],
  SHIFT_CLOSE: ["HEADER", "TEXT", "LINE_BREAK", "SEPARATOR", "SHIFT_SUMMARY", "FOOTER", "QRCODE", "LOGO"],
};

export function createDefaultElements(ticketType) {
  if (ticketType !== "SHIFT_CLOSE") return [createElement()];
  return [
    createElement("HEADER", "{{config.businessName}}", { bold: true, justification: "CENTER", fontSize: "LARGE" }),
    createElement("SEPARATOR"),
    createElement("SHIFT_SUMMARY"),
    createElement("SEPARATOR"),
    createElement("TEXT", "{{print.dateTime}}", { ...DEFAULT_STYLE, justification: "CENTER" }),
  ];
}

export const DATE_FORMATS = ["DAY_MONTH_YEAR", "MONTH_DAY_YEAR", "YEAR_MONTH_DAY"];

export const TIME_FORMATS = ["HOURS_24", "HOURS_12"];

export const DEFAULT_PRINT_FORMATS = {
  dateFormat: "DAY_MONTH_YEAR",
  timeFormat: "HOURS_24",
};
