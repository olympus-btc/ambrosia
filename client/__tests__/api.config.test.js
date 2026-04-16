const ORIGINAL_ENV = process.env;

async function loadConfigModule() {
  jest.resetModules();
  return await import("../src/config/api");
}

describe("api config", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_ELECTRON;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns default API URL when no env var is set", async () => {
    const { API_URL } = await loadConfigModule();
    expect(API_URL).toBe("http://localhost:9154");
  });

  it("uses NEXT_PUBLIC_API_URL when set", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://ambrosia:9155";
    const { API_URL } = await loadConfigModule();
    expect(API_URL).toBe("http://ambrosia:9155");
  });

  it("detects electron environment", async () => {
    process.env.NEXT_PUBLIC_ELECTRON = "true";
    const { IS_ELECTRON } = await loadConfigModule();
    expect(IS_ELECTRON).toBe(true);
  });

  it("detects non-electron environment", async () => {
    const { IS_ELECTRON } = await loadConfigModule();
    expect(IS_ELECTRON).toBe(false);
  });
});
