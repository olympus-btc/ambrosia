import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as configurationsProvider from "@/providers/configurations/configurationsProvider";
import { I18nProvider } from "@i18n/I18nProvider";

import { DailySessionResetCard } from "../DailySessionResetCard";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
  Select: ({ label: selectLabel, children: selectOptions, onChange: onSelectChange, selectedKeys: selectedHourKeys }) => (
    <select aria-label={selectLabel} onChange={onSelectChange} value={(selectedHourKeys && selectedHourKeys[0]) ?? ""}>
      {selectOptions}
    </select>
  ),
  SelectItem: ({ value: hourValue, children: hourLabel }) => <option value={hourValue}>{hourLabel}</option>,
}));

const { addToast } = jest.requireMock("@heroui/react");

const mockUpdateConfig = jest.fn();
const aliceBusinessConfig = { businessName: "Alice Store", dailySessionResetHour: 6 };
const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (message.includes("Failed to update the daily session reset hour")) return;
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

async function changeResetHourAndSave(newHour) {
  const user = userEvent.setup();
  await act(async () => {
    render(
      <I18nProvider>
        <DailySessionResetCard />
      </I18nProvider>,
    );
  });

  fireEvent.change(screen.getByLabelText("cardDailySessionReset.label"), { target: { value: String(newHour) } });
  await user.click(screen.getByText("cardDailySessionReset.saveButton"));
}

describe("DailySessionResetCard", () => {
  it("shows the currently configured reset hour", async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <DailySessionResetCard />
        </I18nProvider>,
      );
    });

    expect(screen.getByLabelText("cardDailySessionReset.label")).toHaveValue("6");
  });

  it("saves the daily session reset hour in the business configuration and confirms it", async () => {
    await changeResetHourAndSave(7);

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({ ...aliceBusinessConfig, dailySessionResetHour: 7 });
      expect(addToast).toHaveBeenCalledWith({
        title: "cardDailySessionReset.successTitle",
        description: "cardDailySessionReset.successDescription",
        color: "success",
      });
    });
  });

  it("shows an error toast when the daily session reset hour update fails", async () => {
    mockUpdateConfig.mockRejectedValueOnce(new Error("request failed"));

    await changeResetHourAndSave(7);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "cardDailySessionReset.errorTitle",
        description: "cardDailySessionReset.errorDescription",
        color: "danger",
      });
    });
  });
});
