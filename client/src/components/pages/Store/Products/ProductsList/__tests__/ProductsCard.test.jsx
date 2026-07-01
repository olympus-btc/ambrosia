import { render, screen, fireEvent } from "@testing-library/react";

import { ProductsCard } from "../ProductsCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, shadow, className }) => <div data-shadow={shadow} className={className}>{children}</div>,
  CardBody: ({ children, className }) => <div className={className}>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
  Image: ({ src, alt }) => <div role="img" aria-label={alt} data-src={src} />,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress }) => <button data-testid="edit-button" onClick={onPress}>edit</button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => <button data-testid="delete-button" onClick={onPress}>delete</button>,
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress }) => <button data-testid="view-button" onClick={onPress}>view</button>,
}));

jest.mock("@/components/shared/VariantsButton", () => ({
  VariantsButton: ({ onPress }) => <button data-testid="variants-button" onClick={onPress}>variants</button>,
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (cents) => `$${cents}` }),
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

const mockStoredAssetUrl = jest.fn((url) => (url ? `cdn${url}` : null));
jest.mock("@/components/utils/storedAssetUrl", () => ({
  __esModule: true,
  storedAssetUrl: (...args) => mockStoredAssetUrl(...args),
}));

const product = {
  id: 1,
  name: "Jade Wallet",
  hasVariants: false,
  imageUrl: "/images/jade.png",
  priceCents: 1000,
  quantity: 10,
  minStockThreshold: 0,
};

const defaultProps = {
  product,
  canManageProducts: true,
  onEditProduct: jest.fn(),
  onDeleteProduct: jest.fn(),
  onViewProduct: jest.fn(),
  onManageVariants: jest.fn(),
};

function renderCard(props = {}) {
  return render(<ProductsCard {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductsCard", () => {
  it("renders product name", () => {
    renderCard();
    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
  });

  it("does not render variants button for simple product", () => {
    renderCard({ product: { ...product, hasVariants: false } });
    expect(screen.queryByTestId("variants-button")).not.toBeInTheDocument();
  });

  it("renders variants button for variant product", () => {
    const onManageVariants = jest.fn();
    renderCard({ product: { ...product, hasVariants: true }, onManageVariants });
    expect(screen.getByTestId("variants-button")).toBeInTheDocument();
  });

  it("renders image via storedAssetUrl", () => {
    renderCard();
    expect(mockStoredAssetUrl).toHaveBeenCalledWith("/images/jade.png");
    expect(screen.getByRole("img", { name: "Jade Wallet" }).getAttribute("data-src")).toBe("cdn/images/jade.png");
  });

  it("renders an image placeholder when imageUrl is missing", () => {
    renderCard({ product: { ...product, imageUrl: null } });
    expect(screen.getByTestId("product-card-image-placeholder-1")).toBeInTheDocument();
  });

  it("renders edit and delete icon buttons", () => {
    renderCard();
    expect(screen.getByTestId("edit-button")).toBeInTheDocument();
    expect(screen.getByTestId("delete-button")).toBeInTheDocument();
  });

  it("calls onEditProduct when edit button is pressed", () => {
    const onEditProduct = jest.fn();
    renderCard({ onEditProduct });
    fireEvent.click(screen.getByTestId("edit-button"));
    expect(onEditProduct).toHaveBeenCalledWith(product);
  });

  it("calls onDeleteProduct when delete button is pressed", () => {
    const onDeleteProduct = jest.fn();
    renderCard({ onDeleteProduct });
    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onDeleteProduct).toHaveBeenCalledWith(product);
  });

  it("hides edit and delete buttons when canManageProducts is false", () => {
    renderCard({ canManageProducts: false });
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-button")).not.toBeInTheDocument();
  });

  it("always renders view button regardless of canManageProducts", () => {
    renderCard({ canManageProducts: false });
    expect(screen.getByTestId("view-button")).toBeInTheDocument();
  });

  it("calls onViewProduct when view button is pressed", () => {
    const onViewProduct = jest.fn();
    renderCard({ onViewProduct });
    fireEvent.click(screen.getByTestId("view-button"));
    expect(onViewProduct).toHaveBeenCalledWith(product);
  });
});
