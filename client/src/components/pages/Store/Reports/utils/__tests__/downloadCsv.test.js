import { downloadCsv } from "../downloadCsv";

describe("downloadCsv", () => {
  let clickAnchorSpy;

  beforeEach(() => {
    clickAnchorSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => "blob:csv-download");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    clickAnchorSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("downloads CSV content with the requested filename", () => {
    downloadCsv("name,total\nAlice,100", "sales-report.csv");

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickAnchorSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv-download");
    expect(document.querySelector("a[download='sales-report.csv']")).not.toBeInTheDocument();
  });

  it("revokes the object URL when the download click fails", () => {
    clickAnchorSpy.mockImplementation(() => {
      throw new Error("Download blocked");
    });

    expect(() => downloadCsv("name,total\nAlice,100", "sales-report.csv")).toThrow("Download blocked");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv-download");
  });
});
