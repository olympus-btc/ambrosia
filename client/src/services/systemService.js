import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getRestartCapabilities() {
  const capabilitiesResponse = await httpClient("/system/restart-capabilities");
  if (!capabilitiesResponse.ok) {
    throw await buildParsedHttpError(capabilitiesResponse, "Failed to get restart capabilities");
  }
  return await parseJsonResponse(capabilitiesResponse, null);
}

export async function restartServer() {
  const restartServerResponse = await httpClient("/system/restart-server", { method: "POST" });
  if (!restartServerResponse.ok) {
    throw await buildParsedHttpError(restartServerResponse, "Failed to restart server");
  }
  return await parseJsonResponse(restartServerResponse, null);
}

export async function restartPhoenixd() {
  const restartPhoenixdResponse = await httpClient("/system/restart-phoenixd", { method: "POST" });
  if (!restartPhoenixdResponse.ok) {
    throw await buildParsedHttpError(restartPhoenixdResponse, "Failed to restart phoenixd");
  }
  return await parseJsonResponse(restartPhoenixdResponse, null);
}
