import { render, screen, fireEvent } from "@testing-library/react";

import { ProductsCard } from "../ProductsCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("lucide-react", () => ({
  Pencil: () => <span>PencilIcon</span>,
  Trash: () => <span>TrashIcon</span>,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, "aria-label": ariaLabel, isIconOnly, ...props }) => (
    <button aria-label={ariaLabel} onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children, shadow }) => <div data-shadow={shadow}>{children}</div>,
  CardBody: ({ children, className }) => <div className={className}>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
  Image: ({ src, alt, width, height }) => <div role="img" aria-label={alt} data-src={src} data-width={width} data-height={height} />,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

const mockStoredAssetUrl = jest.fn((url) => `cdn${url}`);
jest.mock("@/components/utils/storedAssetUrl", () => ({
  __esModule: true,
  storedAssetUrl: (...args) => mockStoredAssetUrl(...args),
}));

const product = {
  id: 1,
  name: "Jade Wallet",
  price_cents: 1600,
  quantity: 10,
  image_url: "/images/jade.png",
};

const defaultProps = {
  product,
  status: "ok",
  normalizeNumber: (v) => Number(v ?? 0),
  formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  canManageProducts: true,
  onEditProduct: jest.fn(),
  onDeleteProduct: jest.fn(),
};

function renderCard(props = {}) {
  return render(<ProductsCard {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductsCard", () => {
  it("renders product name and price", () => {
    renderCard();

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText("$16.00")).toBeInTheDocument();
  });

  it("renders quantity chip", () => {
    renderCard();

    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders status chip with translation key", () => {
    renderCard({ status: "ok" });
    expect(screen.getByText("status.ok")).toBeInTheDocument();
  });

  it("renders status.low chip when status is low", () => {
    renderCard({ status: "low" });
    expect(screen.getByText("status.low")).toBeInTheDocument();
  });

  it("renders status.out chip when status is out", () => {
    renderCard({ status: "out" });
    expect(screen.getByText("status.out")).toBeInTheDocument();
  });

  it("renders image via storedAssetUrl", () => {
    renderCard();

    expect(mockStoredAssetUrl).toHaveBeenCalledWith("/images/jade.png");
    expect(screen.getByRole("img", { name: "Jade Wallet" }).getAttribute("data-src")).toBe("cdn/images/jade.png");
  });

  it("calls onEditProduct when edit button is pressed", () => {
    const onEditProduct = jest.fn();
    renderCard({ onEditProduct });

    fireEvent.click(screen.getByRole("button", { name: "Edit Product" }));
    expect(onEditProduct).toHaveBeenCalledWith(product);
  });

  it("calls onDeleteProduct when delete button is pressed", () => {
    const onDeleteProduct = jest.fn();
    renderCard({ onDeleteProduct });

    fireEvent.click(screen.getByRole("button", { name: "Delete Product" }));
    expect(onDeleteProduct).toHaveBeenCalledWith(product);
  });

  it("hides action buttons when canManageProducts is false", () => {
    renderCard({ canManageProducts: false });

    expect(screen.queryByRole("button", { name: "Edit Product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Product" })).not.toBeInTheDocument();
  });

  it("uses productStock as fallback when quantity is undefined", () => {
    renderCard({
      product: { ...product, quantity: undefined, productStock: 7 },
    });

    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
