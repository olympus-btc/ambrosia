const DEFAULT_API_URL = "http://localhost:9154";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

// Server-side proxy routes use INTERNAL_API_URL when running inside Docker
// (where localhost resolves to the container itself, not the host).
// Falls back to NEXT_PUBLIC_API_URL for local dev without Docker.
export const API_URL = process.env.INTERNAL_API_URL || getApiUrl();
