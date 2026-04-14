export async function parseJsonResponse(response, fallbackValue = null) {
  if (!response) return fallbackValue;

  if (response.status === 204) return fallbackValue;

  const rawBody = await response.text();
  if (!rawBody) return fallbackValue;

  try {
    const parsedBody = JSON.parse(rawBody);
    return parsedBody;
  } catch {
    return fallbackValue;
  }
}
