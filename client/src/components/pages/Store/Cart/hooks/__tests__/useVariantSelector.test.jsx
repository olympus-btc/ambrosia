import { renderHook, act, waitFor } from "@testing-library/react";

import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";

import { useVariantSelector } from "../useVariantSelector";

jest.mock("@/components/pages/Store/hooks/useProductVariants");

const mockFetchProductDetail = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useProductVariants.mockReturnValue({ fetchProductDetail: mockFetchProductDetail });
});

const product = { id: "p1", name: "T-Shirt" };

const productDetail = {
  options: [
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
  ],
  variants: [
    { id: "v1", optionValueIds: ["val-red", "val-s"], priceCents: 1000, quantity: 5 },
    { id: "v2", optionValueIds: ["val-red", "val-l"], priceCents: 1200, quantity: 0 },
    { id: "v3", optionValueIds: ["val-blue", "val-s"], priceCents: 900, quantity: 3 },
  ],
};

function setup(selectorProps = {}) {
  const onClose = jest.fn();
  const onAddToCart = jest.fn();
  const { result } = renderHook(() => useVariantSelector({ product, isOpen: true, onClose, onAddToCart, ...selectorProps }),
  );
  return { result, onClose, onAddToCart };
}

describe("useVariantSelector", () => {
  describe("initial fetch", () => {
    it("fetches product detail when isOpen becomes true", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      setup();
      await waitFor(() => expect(mockFetchProductDetail).toHaveBeenCalledWith("p1"));
    });

    it("does not fetch when isOpen is false", () => {
      const { result } = renderHook(() => useVariantSelector({ product, isOpen: false, onClose: jest.fn(), onAddToCart: jest.fn() }),
      );
      expect(mockFetchProductDetail).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes options and variants after successful fetch", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.options).toHaveLength(2);
    });

    it("leaves options empty when fetch fails", async () => {
      mockFetchProductDetail.mockRejectedValue(new Error("network error"));
      const { result } = setup();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.options).toHaveLength(0);
    });
  });

  describe("toggleOptionValue", () => {
    it("selects an option value", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));

      expect(result.current.selectedValues["type-color"]).toBe("val-red");
    });

    it("deselects when the same value is toggled again", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-color", "val-red"));

      expect(result.current.selectedValues["type-color"]).toBeUndefined();
    });

    it("replaces current value when a different value for same type is toggled", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-color", "val-blue"));

      expect(result.current.selectedValues["type-color"]).toBe("val-blue");
    });
  });

  describe("matchedVariant and derived state", () => {
    it("matchedVariant is null when not all options are selected", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));

      expect(result.current.allSelected).toBe(false);
      expect(result.current.matchedVariant).toBeNull();
    });

    it("finds matching variant when all options are selected", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-s"));

      expect(result.current.allSelected).toBe(true);
      expect(result.current.matchedVariant?.id).toBe("v1");
    });

    it("isOutOfStock is true when matched variant has quantity 0", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-l"));

      expect(result.current.matchedVariant?.id).toBe("v2");
      expect(result.current.isOutOfStock).toBe(true);
    });

    it("isDisabled is false when a valid in-stock variant is matched", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-s"));

      expect(result.current.isDisabled).toBe(false);
    });

    it("isDisabled is true when matched variant is out of stock", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-l"));

      expect(result.current.isDisabled).toBe(true);
    });

    it("does not match inactive variants even when they have stock", async () => {
      mockFetchProductDetail.mockResolvedValue({
        ...productDetail,
        variants: [
          { id: "v1", isActive: false, optionValueIds: ["val-red", "val-s"], priceCents: 1000, quantity: 5 },
        ],
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-s"));

      expect(result.current.matchedVariant).toBeNull();
      expect(result.current.isDisabled).toBe(true);
    });
  });

  describe("isValueAvailable", () => {
    it("returns true for a value that leads to an in-stock variant", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const colorOption = productDetail.options[0];
      expect(result.current.isValueAvailable(colorOption, "val-red")).toBe(true);
    });

    it("returns false for a value that only leads to out-of-stock variants", async () => {
      const detailWithNoStock = {
        ...productDetail,
        variants: [
          { id: "v1", optionValueIds: ["val-red", "val-s"], priceCents: 1000, quantity: 0 },
          { id: "v2", optionValueIds: ["val-red", "val-l"], priceCents: 1200, quantity: 0 },
          { id: "v3", optionValueIds: ["val-blue", "val-s"], priceCents: 900, quantity: 3 },
        ],
      };
      mockFetchProductDetail.mockResolvedValue(detailWithNoStock);
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const colorOption = productDetail.options[0];
      expect(result.current.isValueAvailable(colorOption, "val-red")).toBe(false);
    });

    it("returns false when matching variants are inactive", async () => {
      mockFetchProductDetail.mockResolvedValue({
        ...productDetail,
        variants: [
          { id: "v1", isActive: false, optionValueIds: ["val-red", "val-s"], priceCents: 1000, quantity: 5 },
          { id: "v2", isActive: false, optionValueIds: ["val-red", "val-l"], priceCents: 1200, quantity: 5 },
        ],
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const colorOption = productDetail.options[0];
      expect(result.current.isValueAvailable(colorOption, "val-red")).toBe(false);
    });
  });

  describe("handleAddToCart", () => {
    it("calls onAddToCart with product and variant (with displayName) then onClose", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result, onAddToCart, onClose } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.toggleOptionValue("type-color", "val-red"));
      act(() => result.current.toggleOptionValue("type-size", "val-s"));
      act(() => result.current.handleAddToCart());

      expect(onAddToCart).toHaveBeenCalledWith(
        product,
        expect.objectContaining({ id: "v1", displayName: "Red / S" }),
      );
      expect(onClose).toHaveBeenCalled();
    });

    it("does nothing when no variant is matched", async () => {
      mockFetchProductDetail.mockResolvedValue(productDetail);
      const { result, onAddToCart } = setup();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.handleAddToCart());

      expect(onAddToCart).not.toHaveBeenCalled();
    });
  });
});
