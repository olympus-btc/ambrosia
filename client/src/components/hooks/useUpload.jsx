import { useState, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (files) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await httpClient("/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      return data.uploads;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}
