import { storedAssetUrl } from "../storedAssetUrl";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("storedAssetUrl", () => {
  it("returns null when url is falsy", () => {
    expect(storedAssetUrl("")).toBeNull();
    expect(storedAssetUrl(null)).toBeNull();
  });

  it("returns uploads path as-is", () => {
    expect(storedAssetUrl("/uploads/file.png")).toBe("/uploads/file.png");
  });

  it("removes /api prefix for uploads paths", () => {
    expect(storedAssetUrl("/api/uploads/file.png")).toBe("/uploads/file.png");
  });

  it("extracts uploads path from absolute url", () => {
    expect(storedAssetUrl("https://cdn.test/uploads/file.png")).toBe(
      "/uploads/file.png",
    );
  });

  it("returns input when url has no uploads segment", () => {
    expect(storedAssetUrl("https://cdn.test/assets/file.png")).toBe(
      "https://cdn.test/assets/file.png",
    );
  });

  it("returns input when url parsing throws", () => {
    const originalUrl = global.URL;
    global.URL = jest.fn(() => {
      throw new Error("bad-url");
    });

    expect(storedAssetUrl("not-a-valid-url")).toBe("not-a-valid-url");

    global.URL = originalUrl;
  });
});
