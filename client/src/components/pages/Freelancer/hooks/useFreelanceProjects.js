"use client";

import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildParsedHttpError } from "../../Store/utils/buildHttpError";

export function useFreelanceProjects({ skipForbiddenRedirect = false } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const projectsResponse = await httpClient("/freelance/projects", { skipForbiddenRedirect });
      setForbidden(projectsResponse.status === 403);
      if (!projectsResponse.ok) return;

      const projectsData = await parseJsonResponse(projectsResponse, []);
      setProjects(toArray(projectsData));
    } catch (loadProjectsError) {
      setLoadError(loadProjectsError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  const createFreelanceProject = useCallback(
    async (clientId, projectRequest) => {
      const createProjectResponse = await httpClient(`/freelance/clients/${clientId}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectRequest),
        skipForbiddenRedirect: true,
      });

      if (createProjectResponse.ok === false) {
        throw await buildParsedHttpError(createProjectResponse, "Error creating freelance project");
      }

      const createdProjectData = await parseJsonResponse(createProjectResponse, {});
      await fetchProjects();
      return createdProjectData;
    },
    [fetchProjects],
  );

  const updateFreelanceProject = useCallback(
    async (projectId, projectRequest) => {
      const updateProjectResponse = await httpClient(`/freelance/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectRequest),
        skipForbiddenRedirect: true,
      });

      if (updateProjectResponse.ok === false) {
        throw await buildParsedHttpError(updateProjectResponse, "Error updating freelance project");
      }

      const updatedProjectData = await parseJsonResponse(updateProjectResponse, {});
      await fetchProjects();
      return updatedProjectData;
    },
    [fetchProjects],
  );

  const deleteFreelanceProject = useCallback(
    async (projectId) => {
      const deleteProjectResponse = await httpClient(`/freelance/projects/${projectId}`, {
        method: "DELETE",
        skipForbiddenRedirect: true,
      });

      if (deleteProjectResponse.ok === false) {
        throw await buildParsedHttpError(deleteProjectResponse, "Error deleting freelance project");
      }

      await fetchProjects();
      return deleteProjectResponse;
    },
    [fetchProjects],
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error: loadError,
    forbidden,
    refetch: fetchProjects,
    createFreelanceProject,
    updateFreelanceProject,
    deleteFreelanceProject,
  };
}
