export function buildRequestPayload(headers = {}, body) {
  const requestHeaders = { ...headers };
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body && !requestHeaders["Content-Type"] && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const requestBody = body
    ? isFormData
      ? body
      : JSON.stringify(body)
    : undefined;

  return { requestHeaders, requestBody };
}

export async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json")
    ? response.json()
    : response.text();
}
