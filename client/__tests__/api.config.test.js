const ORIGINAL_ENV = process.env;

async function loadConfigModule() {
  jest.resetModules();
  return await import("../src/config/api");
}

describe("api config", () => {
  const spies = [];

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_PORT_API;
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies.length = 0;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("builds the websocket URL from the browser host and published API port", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://ambrosia:9154";
    process.env.NEXT_PUBLIC_PORT_API = "9155";
    const { getWsUrl } = await loadConfigModule();

    expect(getWsUrl({ hostname: "caja-1.local", protocol: "http:" })).toBe(
      "ws://caja-1.local:9155/ws/payments",
    );
  });

  it("prefers an explicit websocket URL when provided", async () => {
    process.env.NEXT_PUBLIC_WS_URL = "wss://payments.example.com/ws/payments";
    process.env.NEXT_PUBLIC_API_URL = "http://ambrosia:9154";
    process.env.NEXT_PUBLIC_PORT_API = "9155";

    const { getWsUrl } = await loadConfigModule();

    expect(getWsUrl()).toBe("wss://payments.example.com/ws/payments");
  });
});
