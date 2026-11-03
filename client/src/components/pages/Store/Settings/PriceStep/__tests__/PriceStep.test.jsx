import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as configurationsProvider from "@/providers/configurations/configurationsProvider";
import { I18nProvider } from "@i18n/I18nProvider";

import { PriceStep } from "../PriceStep";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

const { addToast } = jest.requireMock("@heroui/react");

const mockUpdateConfig = jest.fn();
const aliceBusinessConfig = { businessName: "Alice Store", priceStep: 0.01 };
const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (message.includes("Failed to update price step")) return;
    originalError.call(console, ...args);
  };
  jest.clearAllMocks();
  mockUpdateConfig.mockResolvedValue({ status: "ok" });
  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: aliceBusinessConfig,
    updateConfig: mockUpdateConfig,
    isLoading: false,
  });
});

afterEach(() => {
  console.error = originalError;
  jest.restoreAllMocks();
});

async function savePriceStep(priceStepValue) {
  const user = userEvent.setup();
  await act(async () => {
    render(
      <I18nProvider>
        <PriceStep />
      </I18nProvider>,
    );
  });

  const priceStepInput = screen.getByLabelText("cardPriceStep.label");
  await user.clear(priceStepInput);
  await user.type(priceStepInput, priceStepValue);
  await user.tab();
  await user.click(screen.getByText("cardPriceStep.saveButton"));
}

describe("PriceStep", () => {
  it("saves the price step in the business configuration and confirms it", async () => {
    await savePriceStep("0.5");

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({ ...aliceBusinessConfig, priceStep: 0.5 });
      expect(addToast).toHaveBeenCalledWith({
        title: "cardPriceStep.successTitle",
        description: "cardPriceStep.successDescription",
        color: "success",
      });
    });
  });

  it("shows an error toast when the price step update fails", async () => {
    mockUpdateConfig.mockRejectedValueOnce(new Error("request failed"));

    await savePriceStep("0.5");

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "cardPriceStep.errorTitle",
        description: "cardPriceStep.errorDescription",
        color: "danger",
      });
    });
  });
});
