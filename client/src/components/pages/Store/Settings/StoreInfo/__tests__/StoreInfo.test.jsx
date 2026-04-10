import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as useUploadHook from "@components/hooks/useUpload";
import { I18nProvider } from "@i18n/I18nProvider";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { StoreInfo } from "../StoreInfo";

const mockUpdateConfig = jest.fn();
const mockUpload = jest.fn();

const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
  businessTaxId: "RFC123456789",
  businessAddress: "Calle Principal 123",
  businessEmail: "tienda@test.com",
  businessPhone: "5551234567",
  businessLogoUrl: "http://localhost:9154/api/assets/logo.png",
};

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("aria-label")) return;
    originalWarn.call(console, ...args);
  };
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (
      message.includes("onAnimationComplete") ||
      message.includes("Unknown event handler property") ||
      message.includes("value` prop") ||
      message.includes("should not be null")
    ) return;
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();

  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: mockConfig,
    isLoading: false,
    updateConfig: mockUpdateConfig,
  });

  jest.spyOn(useUploadHook, "useUpload").mockReturnValue({
    upload: mockUpload,
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

function renderStoreInfo() {
  return render(
    <I18nProvider>
      <StoreInfo />
    </I18nProvider>,
  );
}

describe("StoreInfo", () => {
  describe("Rendering", () => {
    it("renders the StoreInfoCard with config data", async () => {
      await act(async () => { renderStoreInfo(); });
      expect(screen.getByText("Mi Tienda Test")).toBeInTheDocument();
      expect(screen.getByText("RFC123456789")).toBeInTheDocument();
      expect(screen.getByText("Calle Principal 123")).toBeInTheDocument();
    });

    it("does not show modal initially", async () => {
      await act(async () => { renderStoreInfo(); });
      expect(screen.queryByText("modal.title")).not.toBeInTheDocument();
    });
  });

  describe("Modal", () => {
    it("opens modal when edit button is clicked", async () => {
      const user = userEvent.setup();
      await act(async () => { renderStoreInfo(); });

      await user.click(screen.getByText("cardInfo.edit"));

      await waitFor(() => {
        expect(screen.getByText("modal.title")).toBeInTheDocument();
      });
    });

    it("closes modal when cancel button is clicked", async () => {
      const user = userEvent.setup();
      await act(async () => { renderStoreInfo(); });

      await user.click(screen.getByText("cardInfo.edit"));
      await waitFor(() => expect(screen.getByText("modal.title")).toBeInTheDocument());

      await user.click(screen.getByText("modal.cancelButton"));
      await waitFor(() => {
        expect(screen.queryByText("modal.title")).not.toBeInTheDocument();
      });
    });
  });

  describe("Submit", () => {
    it("calls updateConfig and closes modal on successful submit", async () => {
      const user = userEvent.setup();
      mockUpdateConfig.mockResolvedValue({});
      await act(async () => { renderStoreInfo(); });

      await user.click(screen.getByText("cardInfo.edit"));
      await waitFor(() => expect(screen.getByText("modal.title")).toBeInTheDocument());

      await user.click(screen.getByText("modal.editButton"));

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith(
          expect.objectContaining({ businessName: "Mi Tienda Test" }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText("modal.title")).not.toBeInTheDocument();
      });
    });

    it("uploads logo file before calling updateConfig", async () => {
      const user = userEvent.setup();
      const uploadedUrl = "http://localhost:9154/api/assets/new-logo.png";
      mockUpload.mockResolvedValue([{ url: uploadedUrl }]);
      mockUpdateConfig.mockResolvedValue({});

      await act(async () => { renderStoreInfo(); });

      await user.click(screen.getByText("cardInfo.edit"));
      await waitFor(() => expect(screen.getByText("modal.title")).toBeInTheDocument());

      const file = new File(["logo content"], "new-logo.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) await user.upload(fileInput, file);

      await user.click(screen.getByText("modal.editButton"));

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith([file]);
        expect(mockUpdateConfig).toHaveBeenCalledWith(
          expect.objectContaining({ businessLogoUrl: uploadedUrl }),
        );
      });
    });
  });
});
