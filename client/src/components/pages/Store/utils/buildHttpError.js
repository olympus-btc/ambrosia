export const buildHttpError = (response, errorBody) => ({
  status: response.status,
  message: errorBody?.message || "Request failed",
});
