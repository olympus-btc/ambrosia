import { downloadBlob } from "../downloadBlob";

describe("downloadBlob", () => {
  let clickAnchorSpy;

  beforeEach(() => {
    clickAnchorSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => "blob:file-download");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    clickAnchorSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("downloads the blob with the requested filename", () => {
    downloadBlob(new Blob(["binary content"]), "ambrosia-backup.zip");

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickAnchorSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:file-download");
    expect(document.querySelector("a[download='ambrosia-backup.zip']")).not.toBeInTheDocument();
  });

  it("revokes the object URL when the download click fails", () => {
    clickAnchorSpy.mockImplementation(() => {
      throw new Error("Download blocked");
    });

    expect(() => downloadBlob(new Blob(["binary content"]), "ambrosia-backup.zip")).toThrow("Download blocked");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:file-download");
  });
});
