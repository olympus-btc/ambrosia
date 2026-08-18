import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { VariantManager } from "../VariantManager";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ currency: { acronym: "$" } }),
}));

jest.mock("@/components/hooks/useUpload", () => ({
  useUpload: () => ({ upload: jest.fn(), isUploading: false }),
}));

jest.mock("@/components/pages/Store/utils/resolveImageUrl", () => ({
  resolveImageUrl: jest.fn().mockResolvedValue(null),
}));

jest.mock("../OptionTypeManager", () => ({
  OptionTypeManager: ({ optionTypes }) => (
    <div data-testid="option-type-manager">options-{optionTypes.length}</div>
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

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...toastArguments) => mockAddToast(...toastArguments),
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

const defaultVariantManagerProps = {
  product: { id: "p1", variants: [], options: [] },
  variantActions: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  optionTypeActions: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  onRefresh: jest.fn(),
};

function renderManager({
  product = {},
  variantActions = {},
  optionTypeActions = {},
  ...variantManagerProps
} = {}) {
  return render(
    <VariantManager
      {...defaultVariantManagerProps}
      {...variantManagerProps}
      product={{ ...defaultVariantManagerProps.product, ...product }}
      variantActions={{ ...defaultVariantManagerProps.variantActions, ...variantActions }}
      optionTypeActions={{ ...defaultVariantManagerProps.optionTypeActions, ...optionTypeActions }}
    />,
  );
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
    renderManager({ product: { options } });
    expect(screen.getByText("addVariant")).not.toBeDisabled();
  });

  it("shows empty-variants message when options exist but no variants", () => {
    renderManager({ product: { options, variants: [] } });
    expect(screen.getByText("noVariants")).toBeInTheDocument();
  });

  it("renders a VariantCard for each variant", () => {
    renderManager({ product: { options, variants } });
    expect(screen.getByTestId("variant-card-v1")).toBeInTheDocument();
  });

  it("shows the VariantForm after clicking add-variant", () => {
    renderManager({ product: { options } });
    fireEvent.click(screen.getByText("addVariant"));
    expect(screen.getByTestId("variant-form")).toBeInTheDocument();
  });

  it("hides the add-variant button while the form is visible", () => {
    renderManager({ product: { options } });
    fireEvent.click(screen.getByText("addVariant"));
    expect(screen.queryByText("addVariant")).not.toBeInTheDocument();
  });

  it("hides the form when cancel is clicked", () => {
    renderManager({ product: { options } });
    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-cancel"));
    expect(screen.queryByTestId("variant-form")).not.toBeInTheDocument();
  });

  it("calls add variant action and closes the form on successful save", async () => {
    const addVariant = jest.fn().mockResolvedValue("v-new");
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ product: { options }, variantActions: { add: addVariant }, onRefresh });

    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-save"));

    await waitFor(() => expect(addVariant).toHaveBeenCalledWith("p1", expect.objectContaining({ priceCents: 500 })));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.variantCreateSuccess",
      color: "success",
    });
    expect(screen.queryByTestId("variant-form")).not.toBeInTheDocument();
  });

  it("keeps the form open when addVariant returns null", async () => {
    const addVariant = jest.fn().mockResolvedValue(null);
    renderManager({ product: { options }, variantActions: { add: addVariant } });

    fireEvent.click(screen.getByText("addVariant"));
    fireEvent.click(screen.getByText("form-save"));

    await waitFor(() => expect(addVariant).toHaveBeenCalled());
    expect(mockAddToast).not.toHaveBeenCalled();
    expect(screen.getByTestId("variant-form")).toBeInTheDocument();
  });

  it("calls update variant action and refreshes when a card triggers save", async () => {
    const updateVariant = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ product: { options, variants }, variantActions: { update: updateVariant }, onRefresh });

    fireEvent.click(screen.getByText("save-v1"));

    await waitFor(() => expect(updateVariant).toHaveBeenCalledWith("p1", "v1", expect.anything()));
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.variantUpdateSuccess",
      color: "success",
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("calls delete variant action and refreshes when a card triggers delete", async () => {
    const deleteVariant = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ product: { options, variants }, variantActions: { delete: deleteVariant }, onRefresh });

    fireEvent.click(screen.getByText("delete-v1"));

    await waitFor(() => expect(deleteVariant).toHaveBeenCalledWith("p1", "v1"));
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.variantDeleteSuccess",
      color: "success",
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});
