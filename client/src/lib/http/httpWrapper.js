export async function httpWrapper(endpoint, options = {}) {
  return await fetch(`/api/${endpoint}`, {
    credentials: "include",
    ...options,
  });
}
