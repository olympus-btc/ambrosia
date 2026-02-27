import { httpClient } from "@/lib/http";

export async function getInitialSetupStatus() {
  return await httpClient("/initial-setup", {
    method: "GET",
    skipRefresh: true,
  });
}

export async function submitInitialSetup(payload) {
  return await httpClient("/initial-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    skipRefresh: true,
  });
}
