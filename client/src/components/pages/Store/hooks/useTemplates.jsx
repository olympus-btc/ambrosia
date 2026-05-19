"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

export function useTemplates() {
  const { fetchList } = useFetchList();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const templatesData = await fetchList("/templates");
      if (templatesData === null) return;
      setTemplates(toArray(templatesData));
    } catch (error) {
      console.error("Error fetching templates:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  const createTemplate = useCallback(async (templateBody) => {
    try {
      const createTemplate = await httpClient("/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateBody),
      });

      const createdDataTemplate = await parseJsonResponse(createTemplate, null);

      if (createdDataTemplate?.id) {
        setTemplates((prev) => (Array.isArray(prev)
          ? [...prev, { ...templateBody, id: createdDataTemplate.id }]
          : [{ ...templateBody, id: createdDataTemplate.id }]),
        );
      }
      return createdDataTemplate;
    } catch (error) {
      console.error("Error creating template:", error);
      setError(error);
      throw error;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId, templateBody) => {
    if (!templateId) throw new Error("templateId is required");
    try {
      await httpClient(`/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateBody),
      });
      setTemplates((prev) => (Array.isArray(prev)
        ? prev.map((template) => (template.id === templateId ? { ...template, ...templateBody } : template),
        )
        : prev),
      );
      return true;
    } catch (err) {
      console.error("Error updating template:", err);
      setError(err);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId) => {
    if (!templateId) throw new Error("templateId is required");
    try {
      await httpClient(`/templates/${templateId}`, { method: "DELETE" });
      setTemplates((prev) => (Array.isArray(prev) ? prev.filter((template) => template.id !== templateId) : prev),
      );
      return true;
    } catch (err) {
      console.error("Error deleting template:", err);
      setError(err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
