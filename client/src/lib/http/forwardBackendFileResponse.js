const FORWARDED_FILE_HEADER_NAMES = ["content-disposition", "content-type"];

export async function forwardBackendFileResponse(backendFileResponse, additionalForwardedHeaderNames = []) {
  if (!backendFileResponse.ok) {
    const backendErrorText = await backendFileResponse.text();
    return new Response(backendErrorText, { status: backendFileResponse.status });
  }

  const forwardedFileHeaders = new Headers();
  [...FORWARDED_FILE_HEADER_NAMES, ...additionalForwardedHeaderNames].forEach((forwardedHeaderName) => {
    const forwardedHeaderValue = backendFileResponse.headers.get(forwardedHeaderName);
    if (forwardedHeaderValue) forwardedFileHeaders.set(forwardedHeaderName, forwardedHeaderValue);
  });

  return new Response(backendFileResponse.body, { status: backendFileResponse.status, headers: forwardedFileHeaders });
}
