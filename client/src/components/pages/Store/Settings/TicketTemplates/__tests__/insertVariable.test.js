import { insertVariable } from "../insertVariable";

describe("insertVariable", () => {
  it("returns only the variable when the value is empty", () => {
    expect(insertVariable("", "{{print.date}}", null)).toEqual({
      updatedTemplateText: "{{print.date}}",
      cursorPosition: 14,
    });
  });

  it("appends the variable with a space when there is no cursor", () => {
    expect(insertVariable("Printed:", "{{print.date}}", null).updatedTemplateText).toBe("Printed: {{print.date}}");
  });

  it("does not add a second space when the text already ends with one", () => {
    expect(insertVariable("Printed: ", "{{print.date}}", null).updatedTemplateText).toBe("Printed: {{print.date}}");
  });

  it("replaces the selected text", () => {
    expect(insertVariable("Hi bob!", "{{config.businessName}}", { start: 3, end: 6 }).updatedTemplateText).toBe("Hi {{config.businessName}}!");
  });

  it("inserts at the start without a leading space", () => {
    expect(insertVariable("today", "{{print.date}}", { start: 0, end: 0 }).updatedTemplateText).toBe("{{print.date}}today");
  });

  it("separates consecutive variables so date and time stay readable", () => {
    const afterDate = insertVariable("", "{{print.date}}", null);
    const cursorAfterDate = { start: afterDate.cursorPosition, end: afterDate.cursorPosition };
    expect(insertVariable(afterDate.updatedTemplateText, "{{print.time}}", cursorAfterDate).updatedTemplateText).toBe("{{print.date}} {{print.time}}");
  });
});
