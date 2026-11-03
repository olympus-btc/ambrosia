import { formatDuration, parseDurationInput, snapToQuarterHour } from "../quarterHour";

describe("snapToQuarterHour", () => {
  it.each([
    [7, 15],
    [8, 15],
    [22, 15],
    [23, 30],
    [60, 60],
    [97, 90],
    [98, 105],
  ])("snaps %i minutes to %i", (durationMinutes, expectedDurationMinutes) => {
    expect(snapToQuarterHour(durationMinutes)).toBe(expectedDurationMinutes);
  });

  it("never returns less than fifteen minutes", () => {
    expect(snapToQuarterHour(0)).toBe(15);
  });
});

describe("parseDurationInput", () => {
  it.each([
    ["1:30", 90],
    ["1:20", 75],
    ["0:15", 15],
    ["2", 120],
    ["1.5", 90],
    ["1,25", 75],
    [".5", 30],
    [" 1:00 ", 60],
  ])("parses %s as %i minutes", (rawDurationInput, expectedDurationMinutes) => {
    expect(parseDurationInput(rawDurationInput)).toBe(expectedDurationMinutes);
  });

  it.each(["", "abc", "0", "0:00", "1:75", "-1", "25"])("rejects %s", (rawDurationInput) => {
    expect(parseDurationInput(rawDurationInput)).toBeNull();
  });

  it("always returns a multiple of fifteen minutes", () => {
    ["0:07", "1:08", "2:52", "0.3", "3.33"].forEach((rawDurationInput) => {
      expect(parseDurationInput(rawDurationInput) % 15).toBe(0);
    });
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [15, "0:15"],
    [90, "1:30"],
    [600, "10:00"],
  ])("formats %i minutes as %s", (durationMinutes, expectedDurationText) => {
    expect(formatDuration(durationMinutes)).toBe(expectedDurationText);
  });
});
