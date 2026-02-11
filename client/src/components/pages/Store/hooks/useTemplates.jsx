"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const templates = await httpClient("/templates");

      const templatesData = await templates.json();

      if (Array.isArray(templatesData)) {
        setTemplates(templatesData);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateBody) => {
    try {
      const createTemplate = await httpClient("/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateBody),
      });

      const createdDataTemplate = await createTemplate.json();

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
