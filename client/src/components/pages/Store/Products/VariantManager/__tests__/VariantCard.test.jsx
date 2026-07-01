import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { VariantCard } from "../VariantCard";

jest.mock("@/components/utils/storedAssetUrl", () => ({
  storedAssetUrl: (url) => (url ? `/cdn${url}` : null),
}));

jest.mock("../VariantForm", () => ({
  VariantForm: ({ onSave, onCancel }) => (
    <div data-testid="variant-form">
      <button onClick={() => onSave({ priceCents: 800, quantity: 2 })}>form-save</button>
      <button onClick={onCancel}>form-cancel</button>
    </div>
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Image: ({ src, alt }) => <div role="img" aria-label={alt} data-src={src} />,
  Button: ({ children, onPress, isLoading }) => (
    <button onClick={onPress} aria-busy={isLoading}>
      {children}
    </button>
  ),
}));

const options = [
  {
    id: "type-color",
    values: [
      { id: "val-red", value: "Red" },
      { id: "val-blue", value: "Blue" },
    ],
  },
  {
    id: "type-size",
    values: [
      { id: "val-s", value: "S" },
      { id: "val-l", value: "L" },
    ],
  },
];

const currency = { acronym: "$" };

const variant = {
  id: "v1",
  SKU: "T-RED-S",
  priceCents: 1500,
  quantity: 4,
  optionValueIds: ["val-red", "val-s"],
  imageUrl: null,
};

function renderCard(props = {}) {
  return render(
    <VariantCard
      variant={variant}
      currency={currency}
      options={options}
      onSave={jest.fn()}
      onDelete={jest.fn()}
      isProcessing={false}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VariantCard", () => {
  it("shows derived display name from option values", () => {
    renderCard();
    expect(screen.getByTestId("variant-display-name")).toHaveTextContent("Red / S");
  });

  it("falls back to SKU when optionValueIds is empty", () => {
    renderCard({ variant: { ...variant, optionValueIds: [] } });
    expect(screen.getByTestId("variant-display-name")).toHaveTextContent("T-RED-S");
  });

  it("falls back to em-dash when no option ids and no SKU", () => {
    renderCard({ variant: { ...variant, optionValueIds: [], SKU: null } });
    expect(screen.getByTestId("variant-display-name")).toHaveTextContent("—");
  });

  it("shows the formatted price and quantity", () => {
    renderCard();
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it("shows the SKU below the display name when present", () => {
    renderCard();
    expect(screen.getByText("T-RED-S")).toBeInTheDocument();
  });

  it("does not show an image placeholder when imageUrl is null", () => {
    renderCard();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders an image when imageUrl is set", () => {
    renderCard({ variant: { ...variant, imageUrl: "/uploads/img.png" } });
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows the VariantForm when the edit button is clicked", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("edit-variant"));
    expect(screen.getByTestId("variant-form")).toBeInTheDocument();
  });

  it("hides the edit/delete buttons while editing", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("edit-variant"));
    expect(screen.queryByTestId("edit-variant")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-variant")).not.toBeInTheDocument();
  });

  it("returns to card view when form cancel is pressed", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("edit-variant"));
    fireEvent.click(screen.getByText("form-cancel"));
    expect(screen.queryByTestId("variant-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("variant-display-name")).toHaveTextContent("Red / S");
  });

  it("calls onSave with variant id and form data when form is saved", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderCard({ onSave });
    fireEvent.click(screen.getByTestId("edit-variant"));
    fireEvent.click(screen.getByText("form-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("v1", expect.objectContaining({ priceCents: 800 })));
  });

  it("shows delete confirmation when the delete button is clicked", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("delete-variant"));
    expect(screen.getByText("deleteVariantConfirm")).toBeInTheDocument();
  });

  it("cancels delete confirmation when the X button is clicked", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("delete-variant"));
    fireEvent.click(screen.getByRole("button", { name: "cancelVariant" }));
    expect(screen.queryByText("deleteVariantConfirm")).not.toBeInTheDocument();
  });

  it("calls onDelete with the variant id when confirmed", () => {
    const onDelete = jest.fn();
    renderCard({ onDelete });
    fireEvent.click(screen.getByTestId("delete-variant"));
    fireEvent.click(screen.getByText("deleteVariantConfirm"));
    expect(onDelete).toHaveBeenCalledWith("v1");
  });
});
