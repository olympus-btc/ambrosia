import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { BusinessDetailsStep } from "../AddBusinessData";

describe("Step 3 Business Details", () => {
  const mockChange = jest.fn();
  const defaultData = {
    businessType: "store",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessRFC: "",
    businessCurrency: "MXN",
    businessLogo: null,
  };

  function remderBusinessDetails(data = defaultData) {
    return render(
      <I18nProvider>
        <BusinessDetailsStep data={data} onChange={mockChange} />
      </I18nProvider>,
    );
  }

  beforeEach(() => mockChange.mockClear());

  it("renders correct title for store", () => {
    remderBusinessDetails({ ...defaultData, businessType: "store" });
    expect(screen.getByText("step3.titleStore")).toBeInTheDocument();
  });

  it("renders correct title for restaurant", () => {
    remderBusinessDetails({ ...defaultData, businessType: "restaurant" });
    expect(screen.getByText("step3.titleRestaurant")).toBeInTheDocument();
  });

  it("calls onChange when business name changes", () => {
    remderBusinessDetails();
    const input = screen.getByPlaceholderText("step3.fields.businessNamePlaceholder");
    fireEvent.change(input, { target: { value: "Mi tienda" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: "Mi tienda" }),
    );
  });

  it("transforms RFC to uppercase", () => {
    remderBusinessDetails();
    const rfcInput = screen.getByPlaceholderText("step3.fields.businessRFCPlaceholder");
    fireEvent.change(rfcInput, { target: { value: "abc123" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessRFC: "ABC123" }),
    );
  });

  it("calls onChange when currency changes", () => {
    remderBusinessDetails();
    const select = screen.getAllByLabelText("step3.fields.businessCurrency");
    fireEvent.change(select[0], { target: { value: "USD" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessCurrency: "USD" }),
    );
  });

  it("handles logo upload and preview", async () => {
    const { container } = remderBusinessDetails();
    const fileInput = container.querySelector('input[type="file"]');
    const mockFile = new File(["(⌐□_□)"], "logo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessLogo: mockFile }),
    );

    await waitFor(() => {
      expect(container.querySelector("img")).toBeInTheDocument();
    });
  });

  it("handles logo removal", async () => {
    const { container, rerender } = remderBusinessDetails();
    rerender(
      <I18nProvider>
        <BusinessDetailsStep
          data={{ ...defaultData, businessLogo: new File(["x"], "logo.png") }}
          onChange={mockChange}
        />
      </I18nProvider>,
    );

    const removeButton = container.querySelector("button.bg-destructive");
    if (removeButton) {
      fireEvent.click(removeButton);
      expect(mockChange).toHaveBeenCalledWith(
        expect.objectContaining({ businessLogo: null }),
      );
    }
  });
});
