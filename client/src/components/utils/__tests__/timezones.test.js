import { TIMEZONES } from "../timezones";

describe("TIMEZONES", () => {
  it("is not empty and every entry has a zoneId and a label", () => {
    expect(TIMEZONES.length).toBeGreaterThan(0);
    TIMEZONES.forEach((timezone) => {
      expect(typeof timezone.zoneId).toBe("string");
      expect(typeof timezone.label).toBe("string");
    });
  });

  it("is sorted by zoneId", () => {
    const zoneIds = TIMEZONES.map((timezone) => timezone.zoneId);
    const sortedZoneIds = [...zoneIds].sort((first, second) => first.localeCompare(second));
    expect(zoneIds).toEqual(sortedZoneIds);
  });

  it("has no duplicate zoneId entries", () => {
    const zoneIds = TIMEZONES.map((timezone) => timezone.zoneId);
    expect(new Set(zoneIds).size).toBe(zoneIds.length);
  });

  it("builds a readable label with the UTC offset for Mexico City", () => {
    const mexicoCity = TIMEZONES.find((timezone) => timezone.zoneId === "America/Mexico_City");
    expect(mexicoCity).toBeDefined();
    expect(mexicoCity.label).toBe("America/Mexico City (GMT-6)");
  });
});
