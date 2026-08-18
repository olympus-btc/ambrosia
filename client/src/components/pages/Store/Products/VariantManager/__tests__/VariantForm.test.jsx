import { render, screen, fireEvent } from "@testing-library/react";

import { VariantForm } from "../VariantForm";

jest.mock("@/components/shared/ImageUploader", () => ({
  ImageUploader: ({ onChange }) => (
    <div data-testid="image-uploader">
      <button onClick={() => onChange(new File(["img"], "photo.png", { type: "image/png" }))}>
        upload-image
      </button>
      <button onClick={() => onChange(null)}>remove-image</button>
    </div>
  ),
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isDisabled, isLoading }) => (
    <button onClick={onPress} disabled={isDisabled || isLoading}>
      {children}
    </button>
  ),
  Input: ({ label, value, onChange, placeholder }) => (
    <input aria-label={label} value={value} placeholder={placeholder} onChange={onChange} />
  ),
  NumberInput: require("@/test-utils/numberInputMock").NumberInputMock,
  Select: ({ label, children }) => <div aria-label={label}>{children}</div>,
  SelectItem: ({ children }) => <span>{children}</span>,
}));

const options = [
  {
    id: "type-color",
    name: "Color",
    values: [
      { id: "val-red", value: "Red" },
      { id: "val-blue", value: "Blue" },
    ],
  },
];

const currency = { acronym: "$" };

function renderForm(props = {}) {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  render(
    <VariantForm
      initial={{}}
      currency={currency}
      options={[]}
      onSave={onSave}
      onCancel={onCancel}
      isLoading={false}
      {...props}
    />,
  );
  return { onSave, onCancel };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VariantForm", () => {
  it("renders SKU, price and quantity fields", () => {
    renderForm();
    expect(screen.getByLabelText("variantSku")).toBeInTheDocument();
    expect(screen.getByLabelText("variantPrice")).toBeInTheDocument();
    expect(screen.getByLabelText("variantStock")).toBeInTheDocument();
  });

  it("hides the stock field when the product does not track stock", () => {
    renderForm({ isStockTrackedForProduct: false });
    expect(screen.getByLabelText("variantPrice")).toBeInTheDocument();
    expect(screen.queryByLabelText("variantStock")).not.toBeInTheDocument();
  });

  it("renders an option selector for each option type", () => {
    renderForm({ options });
    expect(screen.getByLabelText("Color")).toBeInTheDocument();
  });

  it("shows warning when no option types are provided", () => {
    renderForm({ options: [] });
    expect(screen.getByText("noOptionTypesWarning")).toBeInTheDocument();
  });

  it("save button is disabled when not all options are selected", () => {
    renderForm({ options });
    expect(screen.getByText("saveVariant")).toBeDisabled();
  });

  it("save button is enabled when all options are pre-selected via initial", () => {
    renderForm({ options, initial: { optionValueIds: ["val-red"] } });
    expect(screen.getByText("saveVariant")).not.toBeDisabled();
  });

  it("save button is enabled when there are no option types", () => {
    renderForm({ options: [] });
    expect(screen.getByText("saveVariant")).not.toBeDisabled();
  });

  it("populates fields from the initial prop", () => {
    const initial = { SKU: "SKU-001", priceCents: 2000, quantity: 3 };
    renderForm({ initial });
    expect(screen.getByLabelText("variantSku")).toHaveValue("SKU-001");
    expect(screen.getByLabelText("variantPrice")).toHaveValue("20");
    expect(screen.getByLabelText("variantStock")).toHaveValue("3");
  });

  it("calls onSave with correct data when submitted", () => {
    const { onSave } = renderForm({ options: [] });

    fireEvent.change(screen.getByLabelText("variantSku"), { target: { value: "MY-SKU" } });
    fireEvent.change(screen.getByLabelText("variantPrice"), { target: { value: "15" } });
    fireEvent.blur(screen.getByLabelText("variantPrice"));
    fireEvent.change(screen.getByLabelText("variantStock"), { target: { value: "7" } });
    fireEvent.blur(screen.getByLabelText("variantStock"));
    fireEvent.click(screen.getByText("saveVariant"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        SKU: "MY-SKU",
        priceCents: 1500,
        quantity: 7,
        optionValueIds: [],
      }),
    );
  });

  it("saves a zero quantity when the product does not track stock", () => {
    const { onSave } = renderForm({
      options: [],
      initial: { quantity: 9 },
      isStockTrackedForProduct: false,
    });

    fireEvent.click(screen.getByText("saveVariant"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0 }));
  });

  it("sends null SKU when the field is blank", () => {
    const { onSave } = renderForm({ options: [] });
    fireEvent.click(screen.getByText("saveVariant"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ SKU: null }));
  });

  it("includes pre-selected option value ids in the save payload", () => {
    const { onSave } = renderForm({ options, initial: { optionValueIds: ["val-red"] } });
    fireEvent.click(screen.getByText("saveVariant"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ optionValueIds: ["val-red"] }),
    );
  });

  it("calls onCancel when the cancel button is pressed", () => {
    const { onCancel } = renderForm();
    fireEvent.click(screen.getByText("cancelVariant"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("save and cancel buttons are disabled while loading", () => {
    renderForm({ isLoading: true, options: [] });
    expect(screen.getByText("saveVariant")).toBeDisabled();
    expect(screen.getByText("cancelVariant")).toBeDisabled();
  });

  it("sets imageUrl to null and marks imageRemoved when image is removed", () => {
    const initial = { imageUrl: "/uploads/img.png" };
    const { onSave } = renderForm({ initial, options: [] });

    fireEvent.click(screen.getByText("remove-image"));
    fireEvent.click(screen.getByText("saveVariant"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: null, imageFile: null }),
    );
  });

  it("sets imageFile when a new image is selected", () => {
    const { onSave } = renderForm({ options: [] });

    fireEvent.click(screen.getByText("upload-image"));
    fireEvent.click(screen.getByText("saveVariant"));

    const call = onSave.mock.calls[0][0];
    expect(call.imageFile).toBeInstanceOf(File);
  });
});
