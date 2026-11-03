import { API_URL } from "@/config/api";

const apiUrl = API_URL;

export async function POST(request) {
  const requestBody = await request.text();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const operationIdHeader = request.headers.get("x-backup-operation-id");

  const backendResponse = await fetch(`${apiUrl}/backup/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(operationIdHeader ? { "X-Backup-Operation-Id": operationIdHeader } : {}),
    },
    body: requestBody,
  });

  if (!backendResponse.ok) {
    const errorText = await backendResponse.text();
    return new Response(errorText, { status: backendResponse.status });
  }

  const headers = new Headers();
  const contentDisposition = backendResponse.headers.get("content-disposition");
  const contentType = backendResponse.headers.get("content-type");
  const totalExportBytes = backendResponse.headers.get("x-backup-total-bytes");
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  if (contentType) headers.set("Content-Type", contentType);
  if (totalExportBytes) headers.set("X-Backup-Total-Bytes", totalExportBytes);

  return new Response(backendResponse.body, { status: backendResponse.status, headers });
}
