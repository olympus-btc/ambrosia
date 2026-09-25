import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { ConfigurationsProvider, useConfigurations } from "../configurationsProvider";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/components/hooks/useUpload", () => ({
  useUpload: () => ({ upload: jest.fn() }),
}));

function BusinessTypeProbe() {
  const { businessType, isLoading } = useConfigurations();
  if (isLoading) return null;
  return <span data-testid="businessType">{businessType ?? "null"}</span>;
}

function renderWithConfig(config) {
  httpClient.mockResolvedValue({});
  parseJsonResponse.mockResolvedValue(config);
  render(
    <ConfigurationsProvider>
      <BusinessTypeProbe />
    </ConfigurationsProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = "businessType=; max-age=0";
});

describe("ConfigurationsProvider businessType", () => {
  it.each(["store", "restaurant", "freelance"])(
    "exposes %s from the config",
    async (businessType) => {
      renderWithConfig({ businessType });

      await waitFor(() => expect(screen.getByTestId("businessType")).toHaveTextContent(businessType));
    },
  );

  it("ignores an unknown business type from the config", async () => {
    renderWithConfig({ businessType: "unknown" });

    await waitFor(() => expect(screen.getByTestId("businessType")).toHaveTextContent("null"));
  });
});
