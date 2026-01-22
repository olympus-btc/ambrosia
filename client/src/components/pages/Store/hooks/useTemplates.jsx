"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/apiClient";

export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient("/templates");
      if (Array.isArray(res)) {
        setTemplates(res);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateBody) => {
    try {
      const created = await apiClient("/templates", {
        method: "POST",
        body: templateBody,
      });
      if (created?.id) {
        setTemplates((prev) =>
          Array.isArray(prev)
            ? [...prev, { ...templateBody, id: created.id }]
            : [{ ...templateBody, id: created.id }],
        );
      }
      return created;
    } catch (err) {
      console.error("Error creating template:", err);
      setError(err);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId, templateBody) => {
    if (!templateId) throw new Error("templateId is required");
    try {
      await apiClient(`/templates/${templateId}`, {
        method: "PUT",
        body: templateBody,
      });
      setTemplates((prev) =>
        Array.isArray(prev)
          ? prev.map((template) =>
              template.id === templateId ? { ...template, ...templateBody } : template,
            )
          : prev,
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
      await apiClient(`/templates/${templateId}`, { method: "DELETE" });
      setTemplates((prev) =>
        Array.isArray(prev) ? prev.filter((template) => template.id !== templateId) : prev,
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
