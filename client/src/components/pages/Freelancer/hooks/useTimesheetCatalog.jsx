"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useTimesheetCatalog() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    const tasksResponse = await httpClient("/freelance/tasks", { skipForbiddenRedirect: true });
    const fetchedTasks = tasksResponse.ok ? await parseJsonResponse(tasksResponse, []) : [];
    setTasks(toArray(fetchedTasks));
  }, []);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsResponse, projectsResponse] = await Promise.all([
        httpClient("/freelance/clients", { skipForbiddenRedirect: true }),
        httpClient("/freelance/projects?status=in_progress", { skipForbiddenRedirect: true }),
        fetchTasks(),
      ]);
      const fetchedClients = clientsResponse.ok ? await parseJsonResponse(clientsResponse, []) : [];
      const fetchedProjects = projectsResponse.ok ? await parseJsonResponse(projectsResponse, []) : [];
      setClients(toArray(fetchedClients));
      setProjects(toArray(fetchedProjects));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { clients, projects, tasks, loading, error, refetchTasks: fetchTasks, refetch: fetchCatalog };
}
