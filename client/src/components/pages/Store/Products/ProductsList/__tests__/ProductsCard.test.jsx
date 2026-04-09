import { render, screen, fireEvent } from "@testing-library/react";

import { ProductsCard } from "../ProductsCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, shadow, className }) => <div data-shadow={shadow} className={className}>{children}</div>,
  CardBody: ({ children, className }) => <div className={className}>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
  Image: ({ src, alt, width, height }) => <div role="img" aria-label={alt} data-src={src} data-width={width} data-height={height} />,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress }) => <button data-testid="edit-button" onClick={onPress}><span data-testid="pencil-icon" /></button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => <button data-testid="delete-button" onClick={onPress}><span data-testid="trash-icon" /></button>,
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

  it("renders edit and delete icon buttons", () => {
    renderCard();

    expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });

  it("renders EditButton for edit action", () => {
    renderCard();

    expect(screen.getByTestId("edit-button")).toBeInTheDocument();
  });

  it("renders DeleteButton for delete action", () => {
    renderCard();

    expect(screen.getByTestId("delete-button")).toBeInTheDocument();
  });

  it("calls onEditProduct when edit button is pressed", () => {
    const onEditProduct = jest.fn();
    renderCard({ onEditProduct });

    fireEvent.click(screen.getByTestId("pencil-icon").closest("button"));
    expect(onEditProduct).toHaveBeenCalledWith(product);
  });

  it("calls onDeleteProduct when delete button is pressed", () => {
    const onDeleteProduct = jest.fn();
    renderCard({ onDeleteProduct });

    fireEvent.click(screen.getByTestId("trash-icon").closest("button"));
    expect(onDeleteProduct).toHaveBeenCalledWith(product);
  });

  it("hides action buttons when canManageProducts is false", () => {
    renderCard({ canManageProducts: false });

    expect(screen.queryByTestId("pencil-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trash-icon")).not.toBeInTheDocument();
  });

  it("uses productStock as fallback when quantity is undefined", () => {
    renderCard({
      product: { ...product, quantity: undefined, productStock: 7 },
    });

    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
