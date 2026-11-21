/**
 * @jest-environment node
 */
import { forwardBackendFileResponse } from "../forwardBackendFileResponse";

describe("forwardBackendFileResponse", () => {
  it("forwards the file body with its download headers and any extra headers requested", async () => {
    const backendFileResponse = new Response("zip-bytes", {
      status: 200,
      headers: {
        "Content-Disposition": "attachment; filename=ambrosia-logs.zip",
        "Content-Type": "application/zip",
        "X-Backup-Total-Bytes": "42",
        "X-Internal-Header": "hidden",
      },
    });

    const forwardedFileResponse = await forwardBackendFileResponse(backendFileResponse, ["x-backup-total-bytes"]);

    expect(forwardedFileResponse.status).toBe(200);
    expect(await forwardedFileResponse.text()).toBe("zip-bytes");
    expect(forwardedFileResponse.headers.get("content-disposition")).toBe("attachment; filename=ambrosia-logs.zip");
    expect(forwardedFileResponse.headers.get("content-type")).toBe("application/zip");
    expect(forwardedFileResponse.headers.get("x-backup-total-bytes")).toBe("42");
    expect(forwardedFileResponse.headers.get("x-internal-header")).toBeNull();
  });

  it("returns the backend error text with the same status when the request failed", async () => {
    const backendFileResponse = new Response("Forbidden", { status: 403 });

    const forwardedFileResponse = await forwardBackendFileResponse(backendFileResponse);

    expect(forwardedFileResponse.status).toBe(403);
    expect(await forwardedFileResponse.text()).toBe("Forbidden");
  });
});
