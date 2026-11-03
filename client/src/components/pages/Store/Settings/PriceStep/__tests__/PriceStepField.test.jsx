import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { usePermission } from "@/hooks/usePermission";
import { I18nProvider } from "@i18n/I18nProvider";

import { PriceStepField } from "../PriceStepField";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePermission.mockReturnValue(true);
});

function renderPriceStepField(priceStepFieldProps = {}) {
  return render(
    <I18nProvider>
      <PriceStepField priceStep={0.5} onPriceStepSave={jest.fn()} {...priceStepFieldProps} />
    </I18nProvider>,
  );
}

describe("PriceStepField", () => {
  it("renders the current price step", async () => {
    await act(async () => { renderPriceStepField(); });
    expect(screen.getByLabelText("cardPriceStep.label")).toHaveValue("0.5");
  });

  it("disables the save button until the value changes", async () => {
    await act(async () => { renderPriceStepField(); });
    expect(screen.getByText("cardPriceStep.saveButton")).toBeDisabled();
  });

  it("calls onPriceStepSave with the new value when saved", async () => {
    const user = userEvent.setup();
    const savePriceStep = jest.fn().mockResolvedValue(undefined);
    await act(async () => { renderPriceStepField({ priceStep: 0.01, onPriceStepSave: savePriceStep }); });

    const priceStepInput = screen.getByLabelText("cardPriceStep.label");
    await user.clear(priceStepInput);
    await user.type(priceStepInput, "0.5");
    await user.tab();
    await user.click(screen.getByText("cardPriceStep.saveButton"));

    await waitFor(() => {
      expect(savePriceStep).toHaveBeenCalledWith(0.5);
    });
  });

  it("hides the save button for a role without settings_update", async () => {
    usePermission.mockReturnValue(false);
    await act(async () => { renderPriceStepField(); });
    expect(screen.queryByText("cardPriceStep.saveButton")).not.toBeInTheDocument();
  });
});
