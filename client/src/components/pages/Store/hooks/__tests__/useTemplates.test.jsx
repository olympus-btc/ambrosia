import { act, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { apiClient } from "@/services/apiClient";

import { useTemplates } from "../useTemplates";

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  useEffect(() => {
    handlers.createTemplate = createTemplate;
    handlers.updateTemplate = updateTemplate;
    handlers.deleteTemplate = deleteTemplate;
  }, [createTemplate, updateTemplate, deleteTemplate]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{templates.length}</span>
      <span data-testid="first-name">{templates[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("useTemplates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads templates on mount", async () => {
    apiClient.mockResolvedValueOnce([{ id: "t1", name: "Default" }]);

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Default");
  });

  it("sets empty templates when apiClient returns non-array", async () => {
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when fetching templates fails", async () => {
    apiClient.mockRejectedValueOnce(new Error("fetch-fail"));

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("creates a template and appends it", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ id: "t-2" });

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("0"),
    );

    await act(async () => {
      await handlers.createTemplate({ name: "Ticket A" });
    });

    expect(apiClient).toHaveBeenCalledWith("/templates", {
      method: "POST",
      body: { name: "Ticket A" },
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("updates a template in state", async () => {
    apiClient.mockResolvedValueOnce([{ id: "t-1", name: "Old" }]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("first-name")).toHaveTextContent("Old"),
    );

    await act(async () => {
      await handlers.updateTemplate("t-1", { name: "New" });
    });

    expect(apiClient).toHaveBeenCalledWith("/templates/t-1", {
      method: "PUT",
      body: { name: "New" },
    });
    expect(screen.getByTestId("first-name")).toHaveTextContent("New");
  });

  it("deletes a template from state", async () => {
    apiClient.mockResolvedValueOnce([
      { id: "t-1", name: "A" },
      { id: "t-2", name: "B" },
    ]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("2"),
    );

    await act(async () => {
      await handlers.deleteTemplate("t-1");
    });

    expect(apiClient).toHaveBeenCalledWith("/templates/t-1", {
      method: "DELETE",
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("validates template id for update and delete", async () => {
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );

    await expect(handlers.updateTemplate()).rejects.toThrow(
      "templateId is required",
    );
    await expect(handlers.deleteTemplate()).rejects.toThrow(
      "templateId is required",
    );
  });
});
