import { getNwcConnectionErrorDescription } from "../nwcConnectionErrors";

const translate = (key) => key;

describe("getNwcConnectionErrorDescription", () => {
  it("returns the secrets-locked message when the error status is 409", () => {
    expect(getNwcConnectionErrorDescription(translate, { status: 409 })).toBe(
      "nwcConnection.errors.secretsLocked",
    );
  });

  it("falls back to the code-specific translation for a non-409 error", () => {
    expect(getNwcConnectionErrorDescription(translate, { code: "nwc_connection_failed" })).toBe(
      "nwcConnection.errors.connectionFailed",
    );
  });
});
