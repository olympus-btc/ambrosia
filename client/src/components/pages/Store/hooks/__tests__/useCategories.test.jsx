import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useCategories } from "../useCategories";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const {
    categories,
    loading,
    error,
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
    </div>
  );
}

describe("useCategories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads categories on mount", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cat-1", name: "Hardware" },
      { id: "cat-2", name: "Gadgets" },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Hardware");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
    expect(httpClient).toHaveBeenCalledWith("/categories?type=product");
  });

  it("sets empty categories when api returns non-array", async () => {
    httpClient.mockResolvedValueOnce({});
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

  it("creates a category, refetches, and returns the new id", async () => {
    httpClient.mockResolvedValue({ id: "cat-3" });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-3", name: "Electronics" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    let result;
    await act(async () => {
      result = await handlers.createCategory("Electronics");
    });

    expect(httpClient).toHaveBeenCalledWith("/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Electronics", type: "product" }),
      headers: { "Content-Type": "application/json" },
      notShowError: false,
    });
    expect(result).toBe("cat-3");
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("creates a category with an explicit type override", async () => {
    httpClient.mockResolvedValue({ id: "cat-4" });
    parseJsonResponse.mockResolvedValueOnce([]);
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

  it("updates a category and refetches", async () => {
    httpClient.mockResolvedValue({});
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
    });
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveTextContent("Hardware Updated"));
  });

  it("deletes a category and refetches", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: "cat-1", name: "Hardware" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.deleteCategory("cat-1");
    });

    expect(httpClient).toHaveBeenCalledWith("/categories/cat-1?type=product", {
      method: "DELETE",
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });
});
