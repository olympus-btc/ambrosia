/** @jest-environment-options {"url": "https://ambrosia-test.local/store/settings"} */
import { render, screen, waitFor } from "@testing-library/react";

import { SecureConnection } from "../SecureConnection";

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ value: qrValue, "aria-label": ariaLabel }) => (
    <div data-testid="trust-qr" data-value={qrValue} aria-label={ariaLabel} />
  ),
}));

const trustMetadata = {
  schemaVersion: 1,
  hostname: "ambrosia-test.local",
  displayName: "Ambrosia test",
  subject: "CN=Ambrosia test Root CA",
  sha256: Array(32).fill("AB").join(":"),
  notBefore: "2026-01-01T00:00:00+00:00",
  notAfter: "2030-01-01T00:00:00+00:00",
  trustUrl: "http://untrusted.example/trust/",
};

beforeEach(() => {
  jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => trustMetadata });
});

afterEach(() => jest.restoreAllMocks());

it("uses same-origin HTTPS metadata and derives the enrollment QR from this unit", async () => {
  render(<SecureConnection />);
  expect(await screen.findByText("httpsSession")).toBeInTheDocument();
  expect(screen.getByText(trustMetadata.sha256)).toBeInTheDocument();
  expect(screen.getByTestId("trust-qr")).toHaveAttribute("data-value", "http://ambrosia-test.local/trust/");
  expect(fetch).toHaveBeenCalledWith("/trust/metadata.json", expect.objectContaining({ cache: "no-store", credentials: "omit" }));
  expect(screen.getByRole("link", { name: "instructions" })).toHaveAttribute("href", "/trust/");
});

it("does not show a card when this deployment does not provide trust metadata", async () => {
  fetch.mockResolvedValue({ ok: false, status: 404 });
  const { container } = render(<SecureConnection />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it.each([
  { ...trustMetadata, hostname: "another-unit.local" },
  { ...trustMetadata, sha256: "invalid" },
  { ...trustMetadata, notAfter: "invalid" },
  { ...trustMetadata, schemaVersion: 99 },
  { ...trustMetadata, displayName: " " },
  { ...trustMetadata, notBefore: ["2026-01-01"] },
  { ...trustMetadata, notBefore: trustMetadata.notAfter, notAfter: trustMetadata.notBefore },
])("does not advertise invalid or foreign-unit metadata", async (invalidTrustMetadata) => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => invalidTrustMetadata });
  render(<SecureConnection />);
  expect(await screen.findByRole("status")).toHaveTextContent("unavailable");
  expect(screen.queryByTestId("trust-qr")).not.toBeInTheDocument();
});

it("shows an unavailable state on network failure", async () => {
  fetch.mockRejectedValue(new Error("offline"));
  render(<SecureConnection />);
  expect(await screen.findByRole("status")).toHaveTextContent("unavailable");
});

it("cancels the pending request on unmount", () => {
  fetch.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<SecureConnection />);
  const requestOptions = fetch.mock.calls[0][1];
  unmount();
  expect(requestOptions.signal.aborted).toBe(true);
});
