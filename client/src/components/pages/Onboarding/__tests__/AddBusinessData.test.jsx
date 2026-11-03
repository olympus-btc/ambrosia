import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { BusinessDetailsStep } from "../AddBusinessData";

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  Autocomplete: ({
    children, label, onSelectionChange, selectedKey, defaultFilter,
  }) => {
    const [inputValue, setInputValue] = require("react").useState("");
    const filteredChildren = require("react").Children.toArray(children).filter((child) => (
      !inputValue || defaultFilter(child.props.textValue, inputValue)
    ));
    const inputId = `autocomplete-search-${label}`;

    return (
      <div data-testid="autocomplete-wrapper">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          aria-label={label}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <select
          aria-label={`${label} options`}
          value={selectedKey}
          onChange={(e) => onSelectionChange(e.target.value)}
        >
          <option value="">Select currency</option>
          {filteredChildren}
        </select>
      </div>
    );
  },
  AutocompleteItem: ({ children, textValue }) => (
    <option value={children.toString().split(" ")[0]}>
      {textValue || children}
    </option>
  ),
}));

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
    timezone: "America/Mexico_City",
    businessLogo: null,
  };

  function renderBusinessDetails(businessData = defaultData) {
    return render(
      <I18nProvider>
        <BusinessDetailsStep businessData={businessData} onChange={mockChange} />
      </I18nProvider>,
    );
  }

  beforeEach(() => {
    mockChange.mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders correct title for store", () => {
    renderBusinessDetails({ ...defaultData, businessType: "store" });
    expect(screen.getByText("step3.titleStore")).toBeInTheDocument();
  });

  it("renders correct title for restaurant", () => {
    renderBusinessDetails({ ...defaultData, businessType: "restaurant" });
    expect(screen.getByText("step3.titleRestaurant")).toBeInTheDocument();
  });

  it("renders correct title for freelance", () => {
    renderBusinessDetails({ ...defaultData, businessType: "freelance" });
    expect(screen.getByText("step3.titleFreelance")).toBeInTheDocument();
  });

  it("shows the profession field only for freelance", () => {
    renderBusinessDetails({ ...defaultData, businessType: "store" });
    expect(screen.queryByPlaceholderText("step3.fields.businessProfessionPlaceholder")).not.toBeInTheDocument();
  });

  it("calls onChange when profession changes for freelance", () => {
    renderBusinessDetails({ ...defaultData, businessType: "freelance", businessProfession: "" });
    const professionInput = screen.getByPlaceholderText("step3.fields.businessProfessionPlaceholder");
    fireEvent.change(professionInput, { target: { value: "Graphic Designer" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessProfession: "Graphic Designer" }),
    );
  });

  it("calls onChange when business name changes", () => {
    renderBusinessDetails();
    const input = screen.getByPlaceholderText("step3.fields.businessNamePlaceholder");
    fireEvent.change(input, { target: { value: "Mi tienda" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: "Mi tienda" }),
    );
  });

  it("transforms RFC to uppercase", () => {
    renderBusinessDetails();
    const rfcInput = screen.getByPlaceholderText("step3.fields.businessRFCPlaceholder");
    fireEvent.change(rfcInput, { target: { value: "abc123" } });
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessRFC: "ABC123" }),
    );
  });

  it("calls onChange when currency changes", async () => {
    renderBusinessDetails();
    const select = screen.getByLabelText("step3.fields.businessCurrency options");
    fireEvent.change(select, { target: { value: "USD" } });

    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ businessCurrency: "USD" }),
    );
  });

  it("filters currencies by currency name", async () => {
    renderBusinessDetails();
    const searchInput = screen.getByLabelText("step3.fields.businessCurrency");
    fireEvent.change(searchInput, { target: { value: "mex" } });

    expect(screen.getByRole("option", { name: "MXN - Peso mexicano" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "USD - United States Dollar" })).not.toBeInTheDocument();
  });

  it("renders the timezone selector", () => {
    renderBusinessDetails();
    expect(screen.getByLabelText("step3.fields.businessTimezone")).toBeInTheDocument();
  });

  it("filters timezones by label", async () => {
    renderBusinessDetails();
    const searchInput = screen.getByLabelText("step3.fields.businessTimezone");
    fireEvent.change(searchInput, { target: { value: "Madrid" } });

    expect(screen.getByRole("option", { name: /Europe\/Madrid/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /America\/Mexico City/ })).not.toBeInTheDocument();
  });

  it("handles logo upload and preview", async () => {
    const { container } = renderBusinessDetails();
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
    const { container, rerender } = renderBusinessDetails();
    rerender(
      <I18nProvider>
        <BusinessDetailsStep
          businessData={{ ...defaultData, businessLogo: new File(["x"], "logo.png") }}
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
