import { httpWrapper } from "../httpWrapper";

describe("httpWrapper", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  it("requests the endpoint through the /api proxy without a double slash", async () => {
    await httpWrapper("/users/me");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("forwards the given options alongside the default credentials", async () => {
    await httpWrapper("/auth/refresh", { method: "POST" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});
