import { isElectron } from "../isElectron";

describe("isElectron", () => {
  it("is false when window.electron is not defined", () => {
    expect(isElectron).toBe(false);
  });
});
