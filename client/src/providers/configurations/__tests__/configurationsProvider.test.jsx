import { render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/auth/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/lib/http", () => ({ httpClient: jest.fn(), parseJsonResponse: jest.fn() }));
jest.mock("@/components/hooks/useUpload", () => ({ useUpload: () => ({ upload: jest.fn() }) }));

import { useAuth } from "@/hooks/auth/useAuth";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { ConfigurationsProvider, useConfigurations } from "../configurationsProvider";

const PUBLIC_CONFIG = { businessType: "store", businessName: "Public Name", businessLogoUrl: null };
const FULL_CONFIG = { id: 1, businessType: "store", businessName: "Full Name", businessAddress: "123 Main St" };

function TestComponent() {
  const { config, isLoading } = useConfigurations();

  return (
    <div>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="businessName">{config?.businessName ?? "none"}</span>
      <span data-testid="businessAddress">{config?.businessAddress ?? "none"}</span>
    </div>
  );
}

function buildProviderTree() {
  return (
    <ConfigurationsProvider>
      <TestComponent />
    </ConfigurationsProvider>
  );
}

function renderProvider() {
  return render(buildProviderTree());
}

beforeEach(() => {
  jest.clearAllMocks();
  httpClient.mockResolvedValue({});
});

describe("ConfigurationsProvider", () => {
  it("does not fetch config while the auth state is still resolving", () => {
    useAuth.mockReturnValue({ isAuth: false, isLoading: true });

    renderProvider();

    expect(httpClient).not.toHaveBeenCalled();
  });

  it("fetches config once the auth state has resolved", async () => {
    useAuth.mockReturnValue({ isAuth: false, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(PUBLIC_CONFIG);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("businessName")).toHaveTextContent("Public Name"));
    expect(httpClient).toHaveBeenCalledWith("/config", { skipRefresh: true, skipForbiddenRedirect: true });
  });

  it("refetches config when isAuth transitions from false to true", async () => {
    useAuth.mockReturnValue({ isAuth: false, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(PUBLIC_CONFIG);

    const { rerender } = renderProvider();

    await waitFor(() => expect(screen.getByTestId("businessName")).toHaveTextContent("Public Name"));
    expect(screen.getByTestId("businessAddress")).toHaveTextContent("none");

    useAuth.mockReturnValue({ isAuth: true, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(FULL_CONFIG);

    rerender(buildProviderTree());

    await waitFor(() => expect(screen.getByTestId("businessAddress")).toHaveTextContent("123 Main St"));
    expect(httpClient).toHaveBeenCalledTimes(2);
  });

  it("refetches config when isAuth transitions from true to false", async () => {
    useAuth.mockReturnValue({ isAuth: true, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(FULL_CONFIG);

    const { rerender } = renderProvider();

    await waitFor(() => expect(screen.getByTestId("businessAddress")).toHaveTextContent("123 Main St"));

    useAuth.mockReturnValue({ isAuth: false, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(PUBLIC_CONFIG);

    rerender(buildProviderTree());

    await waitFor(() => expect(screen.getByTestId("businessAddress")).toHaveTextContent("none"));
    expect(httpClient).toHaveBeenCalledTimes(2);
  });

  it("does not refetch on a re-render where isAuth stays the same", async () => {
    useAuth.mockReturnValue({ isAuth: true, isLoading: false });
    parseJsonResponse.mockResolvedValueOnce(FULL_CONFIG);

    const { rerender } = renderProvider();

    await waitFor(() => expect(screen.getByTestId("businessAddress")).toHaveTextContent("123 Main St"));

    rerender(buildProviderTree());

    expect(httpClient).toHaveBeenCalledTimes(1);
  });
});
