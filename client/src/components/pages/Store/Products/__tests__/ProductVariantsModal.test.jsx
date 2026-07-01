import { render, screen } from "@testing-library/react";

import { ProductVariantsModal } from "../ProductVariantsModal";

const mockLoadProductDetail = jest.fn();
const mockFetchProductDetail = jest.fn();

jest.mock("@components/pages/Store/hooks/useProductVariants", () => ({
  useProductVariants: () => ({
    fetchProductDetail: mockFetchProductDetail,
    addVariant: jest.fn(),
    updateVariant: jest.fn(),
    deleteVariant: jest.fn(),
    addOptionType: jest.fn(),
    updateOptionType: jest.fn(),
    deleteOptionType: jest.fn(),
  }),
}));

jest.mock("../hooks/useEditProduct", () => ({
  useEditProduct: () => ({
    productVariants: [{ id: "v1", priceCents: 500, quantity: 2 }],
    productOptions: [{ id: "ot1", name: "Color", values: [] }],
    loadProductDetail: mockLoadProductDetail,
  }),
}));

jest.mock("../VariantManager", () => ({
  VariantManager: ({ productId, variants, options }) => (
    <div data-testid="variant-manager" data-product-id={productId}>
      <span data-testid="variants-count">{variants.length}</span>
      <span data-testid="options-count">{options.length}</span>
    </div>
  ),
}));

jest.mock("@heroui/react", () => ({
  Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
  ModalContent: ({ children }) => <div>{typeof children === "function" ? children({}) : children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children, className }) => <div className={className}>{children}</div>,
}));

const product = { id: "p1", name: "Café Latte" };

function renderModal(modalProps = {}) {
  return render(
    <ProductVariantsModal product={product} isOpen onClose={jest.fn()} {...modalProps} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductVariantsModal", () => {
  it("renders the modal when isOpen is true", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<ProductVariantsModal product={product} isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the product name in the header", () => {
    renderModal();
    expect(screen.getByText("Café Latte")).toBeInTheDocument();
  });

  it("calls loadProductDetail with the product id on open", () => {
    renderModal();
    expect(mockLoadProductDetail).toHaveBeenCalledWith("p1");
  });

  it("renders VariantManager with the loaded variants and options", () => {
    renderModal();
    expect(screen.getByTestId("variant-manager")).toBeInTheDocument();
    expect(screen.getByTestId("variants-count")).toHaveTextContent("1");
    expect(screen.getByTestId("options-count")).toHaveTextContent("1");
  });

  it("passes the product id to VariantManager", () => {
    renderModal();
    expect(screen.getByTestId("variant-manager")).toHaveAttribute("data-product-id", "p1");
  });

  it("does not call loadProductDetail when product has no id", () => {
    render(<ProductVariantsModal product={{}} isOpen onClose={jest.fn()} />);
    expect(mockLoadProductDetail).not.toHaveBeenCalled();
  });
});
