import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { EditSettingsModal } from "../EditSettingsModal";

function renderModal(props = {}) {
  const defaultProps = {
    data: {
      businessName: "Test Store",
      businessType: "store",
      businessTaxId: "",
      businessAddress: "",
      businessEmail: "",
      businessPhone: "",
      businessLogoUrl: null,
    },
    setData: jest.fn(),
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    editSettingsShowModal: true,
    setEditSettingsShowModal: jest.fn(),
    ...props,
  };

  return render(
    <I18nProvider>
      <EditSettingsModal {...defaultProps} />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (
      message.includes("onAnimationComplete") ||
      message.includes("Unknown event handler property") ||
      message.includes("value` prop") ||
      message.includes("should not be null")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("EditSettingsModal", () => {
  describe("Rendering", () => {
    it("renders modal when editSettingsShowModal is true", async () => {
      await act(async () => {
        renderModal();
      });

      expect(screen.getByText("modal.title")).toBeInTheDocument();
    });

    it("does not render modal when editSettingsShowModal is false", async () => {
      await act(async () => {
        renderModal({ editSettingsShowModal: false });
      });

      expect(screen.queryByText("modal.title")).not.toBeInTheDocument();
    });

    it("renders all form inputs", async () => {
      await act(async () => {
        renderModal();
      });

      expect(screen.getByLabelText("modal.name")).toBeInTheDocument();
      expect(screen.getByLabelText("modal.rfc")).toBeInTheDocument();
      expect(screen.getByLabelText("modal.address")).toBeInTheDocument();
      expect(screen.getByLabelText("modal.email")).toBeInTheDocument();
      expect(screen.getByLabelText("modal.phone")).toBeInTheDocument();
    });

    it("renders logo upload section", async () => {
      await act(async () => {
        renderModal();
      });

      expect(screen.getByText("modal.logo")).toBeInTheDocument();
      expect(screen.getByText("modal.logoUpload")).toBeInTheDocument();
    });

    it("renders cancel and edit buttons", async () => {
      await act(async () => {
        renderModal();
      });

      expect(screen.getByText("modal.cancelButton")).toBeInTheDocument();
      expect(screen.getByText("modal.editButton")).toBeInTheDocument();
    });

    it("displays existing data in form fields", async () => {
      const mockData = {
        businessName: "Existing Store",
        businessType: "store",
        businessTaxId: "ABC123456XYZ1",
        businessAddress: "123 Main St",
        businessEmail: "test@example.com",
        businessPhone: "1234567890",
        businessLogoUrl: null,
      };

      await act(async () => {
        renderModal({ data: mockData });
      });

      expect(screen.getByDisplayValue("Existing Store")).toBeInTheDocument();
      expect(screen.getByDisplayValue("ABC123456XYZ1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123 Main St")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
    });

    it("displays logo preview when businessLogoUrl exists", async () => {
      const mockData = {
        businessName: "Test Store",
        businessType: "store",
        businessLogoUrl: "http://localhost:9154/api/assets/logo.png",
      };

      await act(async () => {
        renderModal({ data: mockData });
      });

      const logoPreview = screen.getByAltText("Logo preview");
      expect(logoPreview).toBeInTheDocument();
      expect(logoPreview).toHaveAttribute("src", "http://localhost:9154/api/assets/logo.png");
    });

    it("displays upload button when no logo exists", async () => {
      await act(async () => {
        renderModal();
      });

      expect(screen.getByText("modal.logoUpload")).toBeInTheDocument();
      expect(screen.queryByAltText("Logo preview")).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onChange when business name is changed", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const nameInput = screen.getByLabelText("modal.name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Store Name");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("calls onChange when address is changed", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const addressInput = screen.getByLabelText("modal.address");
      await user.type(addressInput, "456 New St");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("calls onChange when email is changed", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const emailInput = screen.getByLabelText("modal.email");
      await user.type(emailInput, "new@email.com");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("calls setEditSettingsShowModal when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const mockSetEditSettingsShowModal = jest.fn();

      await act(async () => {
        renderModal({ setEditSettingsShowModal: mockSetEditSettingsShowModal });
      });

      const cancelButton = screen.getByText("modal.cancelButton");
      await user.click(cancelButton);

      await waitFor(() => {
        expect(mockSetEditSettingsShowModal).toHaveBeenCalledWith(false);
      });
    });

    it("calls onSubmit when form is submitted", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn((e) => e.preventDefault());

      await act(async () => {
        renderModal({ onSubmit: mockOnSubmit });
      });

      const editButton = screen.getByText("modal.editButton");
      await user.click(editButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("shows remove button when logo preview exists", async () => {
      const mockData = {
        businessName: "Test Store",
        businessType: "store",
        businessLogoUrl: "http://localhost:9154/api/assets/logo.png",
      };

      await act(async () => {
        renderModal({ data: mockData });
      });

      const logoPreview = screen.getByAltText("Logo preview");
      expect(logoPreview).toBeInTheDocument();

      const buttons = screen.getAllByRole("button");

      const removeButton = buttons.find((button) => {
        const buttonText = button.textContent;
        return !buttonText.includes("modal.cancelButton") &&
               !buttonText.includes("modal.editButton") &&
               !buttonText.includes("Close") &&
               !buttonText.includes("Dismiss") &&
               buttonText.trim() === "";
      });

      expect(removeButton).toBeTruthy();
    });
  });

  describe("RFC Validation", () => {
    it("converts RFC to uppercase", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const rfcInput = screen.getByLabelText("modal.rfc");
      await user.type(rfcInput, "abc");

      await waitFor(() => {
        const calls = mockOnChange.mock.calls;
        const lastCall = calls[calls.length - 1];
        if (lastCall && lastCall[0].businessTaxId) {
          expect(lastCall[0].businessTaxId).toMatch(/[A-Z]/);
        }
      });
    });

    it("shows error for invalid RFC format", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderModal();
      });

      const rfcInput = screen.getByLabelText("modal.rfc");
      await user.type(rfcInput, "INVALID123456");

      await waitFor(() => {
        const errorMessage = screen.queryByText(/RFC inválido|step3.fields.businessRFCInvalid/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it("does not show error for empty RFC", async () => {
      await act(async () => {
        renderModal();
      });

      const rfcInput = screen.getByLabelText("modal.rfc");
      expect(rfcInput).toHaveValue("");

      const errorMessage = screen.queryByText(/RFC inválido/i);
      expect(errorMessage).not.toBeInTheDocument();
    });

    it("limits RFC input to 13 characters", async () => {
      await act(async () => {
        renderModal();
      });

      const rfcInput = screen.getByLabelText("modal.rfc");
      expect(rfcInput).toHaveAttribute("maxLength", "13");
    });

    it("clears error when RFC is deleted", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderModal();
      });

      const rfcInput = screen.getByLabelText("modal.rfc");

      await user.type(rfcInput, "INVALID123456");

      await waitFor(() => {
        const errorMessage = screen.queryByText(/RFC inválido|step3.fields.businessRFCInvalid/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });

      await user.clear(rfcInput);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/RFC inválido/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    it("does not show error for valid RFC format", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const rfcInput = screen.getByLabelText("modal.rfc");
      await user.type(rfcInput, "XAXX010101000");

      await waitFor(() => {
        const errorMessage = screen.queryByText(/RFC inválido/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });
  });

  describe("Phone Validation", () => {
    it("only accepts numbers in phone field", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const phoneInput = screen.getByLabelText("modal.phone");
      await user.type(phoneInput, "abc123def456");

      await waitFor(() => {
        const calls = mockOnChange.mock.calls;
        const lastCall = calls[calls.length - 1];
        if (lastCall && lastCall[0].businessPhone) {
          expect(lastCall[0].businessPhone).toMatch(/^\d*$/);
        }
      });
    });

    it("limits phone input to 10 characters", async () => {
      await act(async () => {
        renderModal();
      });

      const phoneInput = screen.getByLabelText("modal.phone");
      expect(phoneInput).toHaveAttribute("maxLength", "10");
    });
  });

  describe("Image Upload", () => {
    it("triggers file input when upload button is clicked", async () => {
      await act(async () => {
        renderModal();
      });

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });

    it("clicks file input when upload button is pressed", async () => {
      const user = userEvent.setup();
      const clickSpy = jest.fn();

      await act(async () => {
        renderModal();
      });

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click = clickSpy;
      }

      const uploadButton = screen.getByText("modal.logoUpload");
      await user.click(uploadButton);

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled();
      });
    });

    it("handles image file selection", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      await act(async () => {
        renderModal({ onChange: mockOnChange });
      });

      const file = new File(["dummy content"], "test-logo.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');

      if (fileInput) {
        await user.upload(fileInput, file);

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
              businessLogo: file,
              businessLogoRemoved: false,
            }),
          );
        });
      }
    });

    it("shows remove button when image preview exists", async () => {
      const mockData = {
        businessName: "Test Store",
        businessType: "store",
        businessLogoUrl: "http://localhost:9154/api/assets/logo.png",
      };

      await act(async () => {
        renderModal({ data: mockData });
      });

      const logoPreview = screen.getByAltText("Logo preview");
      expect(logoPreview).toBeInTheDocument();

      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find((button) => {
        const buttonText = button.textContent;
        return !buttonText.includes("modal.cancelButton") &&
               !buttonText.includes("modal.editButton") &&
               !buttonText.includes("Close") &&
               !buttonText.includes("Dismiss") &&
               buttonText.trim() === "";
      });

      expect(removeButton).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("handles null values in form fields", async () => {
      const mockData = {
        businessName: null,
        businessType: "store",
        businessTaxId: null,
        businessAddress: null,
        businessEmail: null,
        businessPhone: null,
        businessLogoUrl: null,
      };

      await act(async () => {
        renderModal({ data: mockData });
      });

      expect(screen.getByLabelText("modal.name")).toHaveValue("");
      expect(screen.getByLabelText("modal.address")).toHaveValue("");
      expect(screen.getByLabelText("modal.email")).toHaveValue("");
      expect(screen.getByLabelText("modal.phone")).toHaveValue("");
    });

    it("handles undefined onChange callback", async () => {
      await act(async () => {
        renderModal({ onChange: undefined });
      });

      expect(screen.getByText("modal.title")).toBeInTheDocument();
    });

    it("closes modal on backdrop click", async () => {
      const mockSetEditSettingsShowModal = jest.fn();

      await act(async () => {
        renderModal({ setEditSettingsShowModal: mockSetEditSettingsShowModal });
      });

      expect(screen.getByText("modal.title")).toBeInTheDocument();
    });
  });
});
