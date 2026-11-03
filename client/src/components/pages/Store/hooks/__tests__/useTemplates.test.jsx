import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useTemplates } from "../useTemplates";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => {
  const t = (key) => key;
  return { useTranslations: () => t };
});

const handlers = {};

function TestComponent() {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
  } = useTemplates();

  useEffect(() => {
    handlers.createTemplate = createTemplate;
    handlers.updateTemplate = updateTemplate;
    handlers.deleteTemplate = deleteTemplate;
    handlers.setDefaultTemplate = setDefaultTemplate;
  }, [createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{templates.length}</span>
      <span data-testid="first-name">{templates[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="default-names">{templates.filter((template) => template.isDefault).map((template) => template.name).join(",")}</span>
    </div>
  );
}

describe("useTemplates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads templates on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "t1", name: "Default" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Default");
  });

  it("loads templates with skipForbiddenRedirect so a 403 does not force a global redirect", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(httpClient).toHaveBeenCalledWith("/templates", { skipForbiddenRedirect: true });
  });

  it("sets empty templates when apiClient returns non-array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when fetching templates fails", async () => {
    httpClient.mockRejectedValueOnce(new Error("fetch-fail"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("sets error when the templates response is not ok", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("creates a template and appends it", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "t-2" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"),
    );

    await act(async () => {
      await handlers.createTemplate({ name: "Ticket A" });
    });

    expect(httpClient).toHaveBeenCalledWith("/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Ticket A" }),
      skipForbiddenRedirect: true,
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("updates a template in state", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "t-1", name: "Old" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveTextContent("Old"),
    );

    await act(async () => {
      await handlers.updateTemplate("t-1", { name: "New" });
    });

    expect(httpClient).toHaveBeenCalledWith("/templates/t-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "New" }),
      skipForbiddenRedirect: true,
    });
    expect(screen.getByTestId("first-name")).toHaveTextContent("New");
  });

  it("deletes a template from state", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([
      { id: "t-1", name: "A" },
      { id: "t-2", name: "B" },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"),
    );

    await act(async () => {
      await handlers.deleteTemplate("t-1");
    });

    expect(httpClient).toHaveBeenCalledWith("/templates/t-1", {
      method: "DELETE",
      skipForbiddenRedirect: true,
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("sets a template as the default only within its ticket type", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([
      { id: "t-1", name: "alice", ticketType: "RECEIPT", isDefault: true },
      { id: "t-2", name: "bob", ticketType: "SHIFT_CLOSE", isDefault: true },
      { id: "t-3", name: "eve", ticketType: "SHIFT_CLOSE", isDefault: false },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("3"));

    await act(async () => {
      await handlers.setDefaultTemplate("t-3");
    });

    expect(httpClient).toHaveBeenCalledWith("/templates/t-3/default", {
      method: "POST",
      skipForbiddenRedirect: true,
    });
    expect(screen.getByTestId("default-names")).toHaveTextContent("alice,eve");
  });

  it("validates template id for update and delete", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"),
    );

    await expect(handlers.updateTemplate()).rejects.toThrow(
      "templateId is required",
    );
    await expect(handlers.deleteTemplate()).rejects.toThrow(
      "templateId is required",
    );
  });
});
