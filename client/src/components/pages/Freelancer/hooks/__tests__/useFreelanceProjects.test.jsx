import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useFreelanceProjects } from "../useFreelanceProjects";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const hookHandlers = {};

function FreelanceProjectsHookTestComponent() {
  const {
    projects,
    loading,
    error,
    forbidden,
    createFreelanceProject,
    updateFreelanceProject,
    deleteFreelanceProject,
  } = useFreelanceProjects({ skipForbiddenRedirect: true });

  useEffect(() => {
    hookHandlers.createFreelanceProject = createFreelanceProject;
    hookHandlers.updateFreelanceProject = updateFreelanceProject;
    hookHandlers.deleteFreelanceProject = deleteFreelanceProject;
  }, [createFreelanceProject, updateFreelanceProject, deleteFreelanceProject]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{projects.length}</span>
      <span data-testid="first-project-name">{projects[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useFreelanceProjects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads freelance projects on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "project-1", name: "Website" }]);

    render(<FreelanceProjectsHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-project-name")).toHaveTextContent("Website");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
    expect(httpClient).toHaveBeenCalledWith("/freelance/projects", { skipForbiddenRedirect: true });
  });

  it("tracks forbidden project list responses", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });

    render(<FreelanceProjectsHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("creates a freelance project under its client and refetches the list", async () => {
    const projectRequest = {
      name: "Website",
      status: "in_progress",
      hourlyRateCents: 8000,
      isBillable: true,
    };

    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "project-1", clientId: "client-1", ...projectRequest });
    parseJsonResponse.mockResolvedValueOnce([{ id: "project-1", name: "Website" }]);

    render(<FreelanceProjectsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let createdProject;
    await act(async () => {
      createdProject = await hookHandlers.createFreelanceProject("client-1", projectRequest);
    });

    expect(createdProject).toEqual({ id: "project-1", clientId: "client-1", ...projectRequest });
    expect(httpClient).toHaveBeenCalledWith("/freelance/clients/client-1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectRequest),
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("updates a freelance project and refetches the list", async () => {
    const projectRequest = {
      name: "Website Updated",
      status: "done",
      hourlyRateCents: null,
      isBillable: false,
    };

    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "project-1", name: "Website" }]);
    parseJsonResponse.mockResolvedValueOnce({ id: "project-1", ...projectRequest });
    parseJsonResponse.mockResolvedValueOnce([{ id: "project-1", name: "Website Updated" }]);

    render(<FreelanceProjectsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let updatedProject;
    await act(async () => {
      updatedProject = await hookHandlers.updateFreelanceProject("project-1", projectRequest);
    });

    expect(updatedProject).toEqual({ id: "project-1", ...projectRequest });
    expect(httpClient).toHaveBeenCalledWith("/freelance/projects/project-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectRequest),
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("first-project-name")).toHaveTextContent("Website Updated"));
  });

  it("deletes a freelance project and refetches the list", async () => {
    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "project-1", name: "Website" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<FreelanceProjectsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let deleteProjectResponse;
    await act(async () => {
      deleteProjectResponse = await hookHandlers.deleteFreelanceProject("project-1");
    });

    expect(deleteProjectResponse.ok).toBe(true);
    expect(httpClient).toHaveBeenCalledWith("/freelance/projects/project-1", {
      method: "DELETE",
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });

  it("throws parsed errors when project creation fails", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 400 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Invalid project" });

    render(<FreelanceProjectsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await expect(hookHandlers.createFreelanceProject("client-1", { name: "" })).rejects.toMatchObject({
      message: "Error creating freelance project",
      status: 400,
      responseMessage: "Invalid project",
    });
  });
});
