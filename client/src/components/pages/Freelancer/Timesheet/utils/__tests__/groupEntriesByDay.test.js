import { groupEntriesByDay, sumDurationMinutes } from "../groupEntriesByDay";
import { getWeekDays } from "../week";

const weekDays = getWeekDays(new Date(2026, 8, 28));

describe("groupEntriesByDay", () => {
  it("returns an empty list for every day of the week", () => {
    const timeEntriesByDay = groupEntriesByDay([], weekDays);

    expect(Object.keys(timeEntriesByDay)).toHaveLength(7);
    expect(Object.values(timeEntriesByDay).every((dayTimeEntries) => dayTimeEntries.length === 0)).toBe(true);
  });

  it("groups entries by their entry date and ignores entries outside the week", () => {
    const timeEntries = [
      { id: "first", entryDate: "2026-09-28", durationMinutes: 60 },
      { id: "second", entryDate: "2026-09-28", durationMinutes: 30 },
      { id: "third", entryDate: "2026-10-02", durationMinutes: 15 },
      { id: "outside", entryDate: "2026-10-05", durationMinutes: 45 },
    ];

    const timeEntriesByDay = groupEntriesByDay(timeEntries, weekDays);

    expect(timeEntriesByDay["2026-09-28"].map((timeEntry) => timeEntry.id)).toEqual(["first", "second"]);
    expect(timeEntriesByDay["2026-10-02"].map((timeEntry) => timeEntry.id)).toEqual(["third"]);
    expect(timeEntriesByDay["2026-10-05"]).toBeUndefined();
  });
});

describe("sumDurationMinutes", () => {
  it("adds the duration of every entry", () => {
    expect(sumDurationMinutes([{ durationMinutes: 60 }, { durationMinutes: 45 }])).toBe(105);
    expect(sumDurationMinutes([])).toBe(0);
  });
});
