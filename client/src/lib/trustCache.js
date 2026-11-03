export function isTrustPath(requestPath) {
  return requestPath === "/trust" || requestPath.startsWith("/trust/");
}

export async function fetchTrustRequest({ request: trustRequest }) {
  try {
    return await fetch(trustRequest, { cache: "no-store" });
  } catch {
    return Response.error();
  }
}
