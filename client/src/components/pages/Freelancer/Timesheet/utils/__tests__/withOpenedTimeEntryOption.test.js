import { withOpenedTimeEntryOption } from "../withOpenedTimeEntryOption";

const catalogProjects = [{ id: "website-id", name: "Website" }];

describe("withOpenedTimeEntryOption", () => {
  it("keeps the catalog when no time entry is opened", () => {
    expect(withOpenedTimeEntryOption(catalogProjects, undefined, undefined)).toBe(catalogProjects);
  });

  it("keeps the catalog when the opened option is already in it", () => {
    expect(withOpenedTimeEntryOption(catalogProjects, "website-id", "Website")).toBe(catalogProjects);
  });

  it("adds the opened option first when the catalog does not include it", () => {
    expect(withOpenedTimeEntryOption(catalogProjects, "archived-id", "Archived")).toEqual([
      { id: "archived-id", name: "Archived" },
      { id: "website-id", name: "Website" },
    ]);
  });
});
