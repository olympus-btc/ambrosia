import { resolveTemplateVariables } from "../resolveTemplateVariables";

const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
  businessEmail: "contact@ambrosia.mx",
};

describe("resolveTemplateVariables", () => {
  it("returns empty string for falsy values", () => {
    expect(resolveTemplateVariables("")).toBe("");
    expect(resolveTemplateVariables(null)).toBe("");
    expect(resolveTemplateVariables(undefined)).toBe("");
  });

  it("replaces config variables with provided config", () => {
    expect(resolveTemplateVariables("{{config.businessName}}", sampleConfig)).toBe("Ambrosia");
    expect(resolveTemplateVariables("{{config.businessAddress}}", sampleConfig)).toBe("Calle Principal 123");
    expect(resolveTemplateVariables("{{config.businessPhone}}", sampleConfig)).toBe("+52 555 1234567");
    expect(resolveTemplateVariables("{{config.businessEmail}}", sampleConfig)).toBe("contact@ambrosia.mx");
  });

  it("uses sampleConfig when no config is provided", () => {
    expect(resolveTemplateVariables("{{config.businessName}}")).toBe("Ambrosia");
  });

  it("replaces ticket variables with sampleTicket values", () => {
    expect(resolveTemplateVariables("{{ticket.id}}")).toBe("123");
    expect(resolveTemplateVariables("{{ticket.tableName}}")).toBe("Table 4");
    expect(resolveTemplateVariables("{{ticket.roomName}}")).toBe("Main Hall");
    expect(resolveTemplateVariables("{{ticket.date}}")).toBe("2024-01-10 19:30");
    expect(resolveTemplateVariables("{{ticket.total}}")).toBe("215");
    expect(resolveTemplateVariables("{{ticket.invoice}}")).toBe("lnbc10u1p0exampleinvoice");
  });

  it("replaces multiple variables in one string", () => {
    const resolvedTemplateText = resolveTemplateVariables("{{config.businessName}} - {{ticket.tableName}}", sampleConfig);
    expect(resolvedTemplateText).toBe("Ambrosia - Table 4");
  });

  it("leaves unknown variables untouched", () => {
    expect(resolveTemplateVariables("{{unknown.var}}", sampleConfig)).toBe("{{unknown.var}}");
  });

  it("replaces print variables with the default formats", () => {
    const printedAt = new Date(2026, 9, 15, 9, 5);
    expect(resolveTemplateVariables("{{print.date}} {{print.time}}", sampleConfig, undefined, printedAt)).toBe("15/10/2026 09:05");
  });

  it("replaces print variables with the template formats", () => {
    const printedAt = new Date(2026, 9, 15, 21, 30);
    const printFormats = { dateFormat: "MONTH_DAY_YEAR", timeFormat: "HOURS_12" };
    expect(resolveTemplateVariables("{{print.date}} {{print.time}}", sampleConfig, printFormats, printedAt)).toBe("10/15/2026 9:30 PM");
  });

  it("replaces the combined print date and time variable", () => {
    const printedAt = new Date(2026, 9, 15, 21, 30);
    expect(resolveTemplateVariables("Printed: {{print.dateTime}}", sampleConfig, undefined, printedAt)).toBe("Printed: 15/10/2026 21:30");
  });

  it("replaces shift variables with the sample shift formatted with the template formats", () => {
    expect(resolveTemplateVariables("{{shift.cashier}} {{shift.expectedCash}} {{shift.difference}}", sampleConfig)).toBe("Ana 390 5");
    expect(resolveTemplateVariables("{{shift.openedAt}}", sampleConfig, { dateFormat: "YEAR_MONTH_DAY", timeFormat: "HOURS_24" }))
      .toBe("2024-01-10 08:00");
  });
});
