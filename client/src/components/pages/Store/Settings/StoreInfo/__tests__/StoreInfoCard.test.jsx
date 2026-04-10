import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { StoreInfoCard } from "../StoreInfoCard";

const mockData = {
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
      message.includes("Unknown event handler property")
    ) return;
    originalError.call(console, ...args);
  };
  jest.clearAllMocks();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

function renderCard(props = {}) {
  return render(
    <I18nProvider>
      <StoreInfoCard data={mockData} onEdit={jest.fn()} {...props} />
    </I18nProvider>,
  );
}

describe("StoreInfoCard", () => {
  describe("Rendering", () => {
    it("renders the card title", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByText("cardInfo.title")).toBeInTheDocument();
    });

    it("renders all field labels", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByText("cardInfo.name")).toBeInTheDocument();
      expect(screen.getByText("cardInfo.rfc")).toBeInTheDocument();
      expect(screen.getByText("cardInfo.address")).toBeInTheDocument();
      expect(screen.getByText("cardInfo.email")).toBeInTheDocument();
      expect(screen.getByText("cardInfo.phone")).toBeInTheDocument();
      expect(screen.getByText("cardInfo.logo")).toBeInTheDocument();
    });

    it("renders business data from props", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByText("Mi Tienda Test")).toBeInTheDocument();
      expect(screen.getByText("RFC123456789")).toBeInTheDocument();
      expect(screen.getByText("Calle Principal 123")).toBeInTheDocument();
      expect(screen.getByText("tienda@test.com")).toBeInTheDocument();
      expect(screen.getByText("5551234567")).toBeInTheDocument();
    });

    it("renders logo when businessLogoUrl exists", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByAltText("Logo")).toBeInTheDocument();
    });

    it("renders no logo placeholder when businessLogoUrl is null", async () => {
      await act(async () => {
        renderCard({ data: { ...mockData, businessLogoUrl: null } });
      });
      expect(screen.getByText("cardInfo.noLogo")).toBeInTheDocument();
      expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
    });

    it("renders --- placeholder for null optional fields", async () => {
      await act(async () => {
        renderCard({
          data: {
            businessName: "Tienda",
            businessTaxId: null,
            businessAddress: null,
            businessEmail: null,
            businessPhone: null,
            businessLogoUrl: null,
          },
        });
      });
      const placeholders = screen.getAllByText("---");
      expect(placeholders).toHaveLength(4);
    });

    it("renders the edit button", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByText("cardInfo.edit")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onEdit when edit button is pressed", async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      await act(async () => { renderCard({ onEdit: mockOnEdit }); });

      await user.click(screen.getByText("cardInfo.edit"));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });
});
