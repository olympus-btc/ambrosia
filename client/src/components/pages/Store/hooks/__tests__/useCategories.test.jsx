import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useCategories } from "../useCategories";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

let mockCanReadCategories = true;
jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanReadCategories,
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => {
  const categoryTranslations = (key) => key;
  return { useTranslations: () => categoryTranslations };
});

const handlers = {};

function TestComponent() {
  const {
    categories,
    loading,
    error,
    forbidden,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories("product");

  useEffect(() => {
    handlers.createCategory = createCategory;
    handlers.updateCategory = updateCategory;
    handlers.deleteCategory = deleteCategory;
  }, [createCategory, updateCategory, deleteCategory]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{categories.length}</span>
      <span data-testid="first-name">{categories[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useCategories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockCanReadCategories = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads categories on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cat-1", name: "Hardware" },
      { id: "cat-2", name: "Gadgets" },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Hardware");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
    expect(httpClient).toHaveBeenCalledWith("/categories?type=product", {});
  });

  it("sets empty categories when api returns non-array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when fetching fails", async () => {
    httpClient.mockRejectedValueOnce(new Error("network-error"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("sets error when the categories response is not ok", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("creates a category, refetches, and returns the new id", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "cat-3", message: "Category added successfully" });
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-3", name: "Electronics" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    let createdCategoryId;
    await act(async () => {
      createdCategoryId = await handlers.createCategory("Electronics");
    });

    expect(httpClient).toHaveBeenCalledWith("/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Electronics", type: "product" }),
      headers: { "Content-Type": "application/json" },
      notShowError: false,
      skipForbiddenRedirect: true,
    });
    expect(createdCategoryId).toBe("cat-3");
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("creates a category with an explicit type override", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "cat-4", message: "Category added successfully" });
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await act(async () => {
      await handlers.createCategory("Dishes", "dish");
    });

    expect(httpClient).toHaveBeenCalledWith("/categories", expect.objectContaining({
      body: JSON.stringify({ name: "Dishes", type: "dish" }),
    }));
  });

  it("rejects when category creation returns a failed response", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 409 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Category already exists" });

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await expect(handlers.createCategory("Electronics")).rejects.toMatchObject({
      message: "Error creating category",
      status: 409,
      responseMessage: "Category already exists",
    });

    expect(httpClient).toHaveBeenCalledTimes(2);
  });

  it("updates a category and refetches", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware" }]);
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware Updated" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.updateCategory({ categoryId: "cat-1", categoryName: "Hardware Updated" });
    });

    expect(httpClient).toHaveBeenCalledWith("/categories/cat-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Hardware Updated", type: "product" }),
      headers: { "Content-Type": "application/json" },
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveTextContent("Hardware Updated"));
  });

  it("throws when updating a category is rejected by the API", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 400 });

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let thrownError;
    await act(async () => {
      try {
        await handlers.updateCategory({ categoryId: "cat-1", categoryName: "Hardware Updated" });
      } catch (updateCategoryError) {
        thrownError = updateCategoryError;
      }
    });

    expect(thrownError?.status).toBe(400);
  });

  it("deletes a category and refetches", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.deleteCategory("cat-1");
    });

    expect(httpClient).toHaveBeenCalledWith("/categories/cat-1?type=product", {
      method: "DELETE",
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });

  it("throws when deleting a category is rejected by the API", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 409 });

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let thrownError;
    await act(async () => {
      try {
        await handlers.deleteCategory("cat-1");
      } catch (deleteCategoryError) {
        thrownError = deleteCategoryError;
      }
    });

    expect(thrownError?.status).toBe(409);
  });

  it("does not fetch categories when the user lacks categories_read", async () => {
    mockCanReadCategories = false;

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(httpClient).not.toHaveBeenCalled();
  });
});
