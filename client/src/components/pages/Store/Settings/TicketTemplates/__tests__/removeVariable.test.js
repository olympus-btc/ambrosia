import { removeVariable } from "../removeVariable";

describe("removeVariable", () => {
  it("removes the variable and the extra space it leaves", () => {
    expect(removeVariable("Printed: {{print.date}} {{print.time}}", "{{print.date}}")).toBe("Printed: {{print.time}}");
  });

  it("removes every occurrence of the variable", () => {
    expect(removeVariable("{{print.date}} {{print.time}} {{print.date}}", "{{print.date}}")).toBe("{{print.time}}");
  });

  it("returns an empty value when only the variable was present", () => {
    expect(removeVariable("{{print.dateTime}}", "{{print.dateTime}}")).toBe("");
  });

  it("does not remove a different variable that shares a prefix", () => {
    expect(removeVariable("{{print.dateTime}}", "{{print.date}}")).toBe("{{print.dateTime}}");
  });
});
