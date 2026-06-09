import { API_URL } from "@/config/api";

const apiUrl = API_URL;

function buildHeaders(request) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") return;
    headers.set(key, value);
  });
  return headers;
}

async function buildResponse(response) {
  const responseHeaders = {};

  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  if (setCookieHeaders.length > 0) {
    responseHeaders["Set-Cookie"] = setCookieHeaders;
  } else {
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      responseHeaders["Set-Cookie"] = setCookieHeader;
    }
  }

  if (response.status === 204) {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  return Response.json(data, { status: response.status, headers: responseHeaders });
}

async function proxyRequest(request, params, method) {
  const resolvedParams = await params;
  const { search } = new URL(request.url);
  const url = `${apiUrl}/${resolvedParams.slug.join("/")}${search}`;
  const headers = buildHeaders(request);

  const fetchOptions = { method, headers };

  if (method === "POST") {
    fetchOptions.body = request.body;
    fetchOptions.duplex = "half";
  } else if (method === "PUT" || method === "PATCH") {
    fetchOptions.body = await request.text();
  }

  try {
    const response = await fetch(url, fetchOptions);
    return buildResponse(response);
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Failed to fetch", details: error.message },
      { status: 500 },
    );
  }
}

export const GET = (req, { params }) => proxyRequest(req, params, "GET");
export const POST = (req, { params }) => proxyRequest(req, params, "POST");
export const PUT = (req, { params }) => proxyRequest(req, params, "PUT");
export const DELETE = (req, { params }) => proxyRequest(req, params, "DELETE");
