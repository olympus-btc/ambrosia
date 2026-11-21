import { API_URL } from "@/config/api";
import { reportServerError } from "@/lib/logging/reportServerError";

const HEADERS_EXCLUDED_FROM_PROXY = ["content-length", "origin"];

function buildBackendRequestHeaders(incomingRequest) {
  const backendRequestHeaders = new Headers();
  incomingRequest.headers.forEach((headerValue, headerName) => {
    if (HEADERS_EXCLUDED_FROM_PROXY.includes(headerName.toLowerCase())) return;
    backendRequestHeaders.set(headerName, headerValue);
  });
  return backendRequestHeaders;
}

async function buildProxyResponse(backendResponse) {
  const proxyResponseHeaders = {};

  const setCookieHeaders = backendResponse.headers.getSetCookie?.() || [];
  if (setCookieHeaders.length > 0) {
    proxyResponseHeaders["Set-Cookie"] = setCookieHeaders;
  } else {
    const setCookieHeader = backendResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      proxyResponseHeaders["Set-Cookie"] = setCookieHeader;
    }
  }

  if (backendResponse.status === 204) {
    return new Response(null, { status: 204, headers: proxyResponseHeaders });
  }

  const backendContentType = backendResponse.headers.get("content-type");
  const backendResponseBody = backendContentType?.includes("application/json")
    ? await backendResponse.json()
    : await backendResponse.text();

  return Response.json(backendResponseBody, { status: backendResponse.status, headers: proxyResponseHeaders });
}

async function proxyRequest(incomingRequest, routeParams, httpMethod) {
  const resolvedRouteParams = await routeParams;
  const backendPath = `/${resolvedRouteParams.slug.join("/")}`;
  const { search: incomingQueryString } = new URL(incomingRequest.url);
  const backendUrl = `${API_URL}${backendPath}${incomingQueryString}`;

  const backendFetchOptions = { method: httpMethod, headers: buildBackendRequestHeaders(incomingRequest) };

  if (httpMethod === "POST") {
    backendFetchOptions.body = incomingRequest.body;
    backendFetchOptions.duplex = "half";
  } else if (httpMethod === "PUT" || httpMethod === "PATCH" || httpMethod === "DELETE") {
    backendFetchOptions.body = await incomingRequest.text();
  }

  try {
    const backendResponse = await fetch(backendUrl, backendFetchOptions);
    return await buildProxyResponse(backendResponse);
  } catch (proxyError) {
    console.error("Error:", proxyError);
    reportServerError(incomingRequest, proxyError, { type: "api.proxy", method: httpMethod, path: backendPath });
    return Response.json(
      { error: "Failed to fetch", details: proxyError.message },
      { status: 500 },
    );
  }
}

export const GET = (incomingRequest, { params: routeParams }) => proxyRequest(incomingRequest, routeParams, "GET");
export const POST = (incomingRequest, { params: routeParams }) => proxyRequest(incomingRequest, routeParams, "POST");
export const PUT = (incomingRequest, { params: routeParams }) => proxyRequest(incomingRequest, routeParams, "PUT");
export const DELETE = (incomingRequest, { params: routeParams }) => proxyRequest(incomingRequest, routeParams, "DELETE");
