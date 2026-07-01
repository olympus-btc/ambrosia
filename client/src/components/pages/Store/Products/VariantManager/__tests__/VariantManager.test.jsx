import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { VariantManager } from "../index";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ currency: { acronym: "$" } }),
}));

jest.mock("@/components/hooks/useUpload", () => ({
  useUpload: () => ({ upload: jest.fn(), isUploading: false }),
}));

jest.mock("../../utils/resolveImageUrl", () => ({
  resolveImageUrl: jest.fn().mockResolvedValue(null),
}));

jest.mock("../OptionTypeManager", () => ({
  OptionTypeManager: ({ options }) => (
    <div data-testid="option-type-manager">options-{options.length}</div>
  ),
}));

jest.mock("../VariantCard", () => ({
  VariantCard: ({ variant, onSave, onDelete }) => (
    <div data-testid={`variant-card-${variant.id}`}>
      <button onClick={() => onSave(variant.id, { priceCents: 999 })}>save-{variant.id}</button>
      <button onClick={() => onDelete(variant.id)}>delete-{variant.id}</button>
    </div>
  ),
}));

jest.mock("../VariantForm", () => ({
  VariantForm: ({ onSave, onCancel }) => (
    <div data-testid="variant-form">
      <button onClick={() => onSave({ priceCents: 500, quantity: 1, optionValueIds: [] })}>
        form-save
      </button>
      <button onClick={onCancel}>form-cancel</button>
    </div>
  ),
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isDisabled }) => (
    <button onClick={onPress} disabled={isDisabled}>
      {children}
    </button>
  ),
}));

const options = [{ id: "ot1", name: "Color", values: [{ id: "val-red", value: "Red" }] }];
const variants = [
  { id: "v1", priceCents: 1000, quantity: 5, optionValueIds: ["val-red"] },
];

const defaultProps = {
  productId: "p1",
  variants: [],
  options: [],
  onAddVariant: jest.fn(),
  onUpdateVariant: jest.fn(),
  onDeleteVariant: jest.fn(),
  onAddOptionType: jest.fn(),
  onUpdateOptionType: jest.fn(),
  onDeleteOptionType: jest.fn(),
  onRefresh: jest.fn(),
};

function renderManager(props = {}) {
  return render(<VariantManager {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VariantManager", () => {
  it("renders the OptionTypeManager", () => {
    renderManager();
    expect(screen.getByTestId("option-type-manager")).toHaveTextContent("options-0");
  });

  it("shows warning when no option types exist", () => {
    renderManager();
    expect(screen.getByText("noOptionTypesWarning")).toBeInTheDocument();
  });

  it("disables the add-variant button when no options exist", () => {
    renderManager();
    expect(screen.getByText("addVariant")).toBeDisabled();
  });

  it("enables the add-variant button when options exist", () => {
    renderManager({ options });
    expect(screen.getByText("addVariant")).not.toBeDisabled();
  });

  it("shows empty-variants message when options exist but no variants", () => {
    renderManager({ options, variants: [] });
    expect(screen.getByText("noVariants")).toBeInTheDocument();
  });

  it("renders a VariantCard for each variant", () => {
    renderManager({ options, variants });
    expect(screen.getByTestId("variant-card-v1")).toBeInTheDocument();
  });

  it("shows the VariantForm after clicking add-variant", () => {
    renderManager({ options });
    fireEvent.click(screen.getByText("addVariant"));
    expect(screen.getByTestId("variant-form")).toBeInTheDocument();
  });

  it("hides the add-variant button while the form is visible", () => {
    renderManager({ options });
    fireEvent.click(screen.getByText("addVariant"));
    expect(screen.queryByText("addVariant")).not.toBeInTheDocument();
  });

  it("hides the form when cancel is clicked", () => {
    renderManager({ options });
    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-cancel"));
    expect(screen.queryByTestId("variant-form")).not.toBeInTheDocument();
  });

  it("calls onAddVariant and closes the form on successful save", async () => {
    const onAddVariant = jest.fn().mockResolvedValue("v-new");
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ options, onAddVariant, onRefresh });

    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-save"));

    await waitFor(() => expect(onAddVariant).toHaveBeenCalledWith("p1", expect.objectContaining({ priceCents: 500 })));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(screen.queryByTestId("variant-form")).not.toBeInTheDocument();
  });

  it("keeps the form open when addVariant returns null", async () => {
    const onAddVariant = jest.fn().mockResolvedValue(null);
    renderManager({ options, onAddVariant });

    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-save"));

    await waitFor(() => expect(onAddVariant).toHaveBeenCalled());
    expect(screen.getByTestId("variant-form")).toBeInTheDocument();
  });

  it("calls onUpdateVariant and refreshes when a card triggers save", async () => {
    const onUpdateVariant = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ options, variants, onUpdateVariant, onRefresh });

    fireEvent.click(screen.getByText("save-v1"));

    await waitFor(() => expect(onUpdateVariant).toHaveBeenCalledWith("p1", "v1", expect.anything()));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("calls onDeleteVariant and refreshes when a card triggers delete", async () => {
    const onDeleteVariant = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ options, variants, onDeleteVariant, onRefresh });

    fireEvent.click(screen.getByText("delete-v1"));

    await waitFor(() => expect(onDeleteVariant).toHaveBeenCalledWith("p1", "v1"));
    expect(onRefresh).toHaveBeenCalled();
  });
});
