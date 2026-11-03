import { act, renderHook } from "@testing-library/react";

import { useUpload } from "@components/hooks/useUpload";

import { useLogoSource } from "../useLogoSource";

jest.mock("@components/hooks/useUpload");

describe("useLogoSource", () => {
  const uploadLogoFiles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useUpload.mockReturnValue({ upload: uploadLogoFiles, isUploading: false });
  });

  it("starts with the business logo when the element has no image", () => {
    const { result: logoSourceHook } = renderHook(() => useLogoSource("", jest.fn()));
    expect(logoSourceHook.current.logoSource).toBe("BUSINESS_LOGO");
  });

  it("starts with a custom image when the element already has one", () => {
    const { result: logoSourceHook } = renderHook(() => useLogoSource("/uploads/2026-10/bob.png", jest.fn()));
    expect(logoSourceHook.current.logoSource).toBe("CUSTOM_IMAGE");
  });

  it("clears the custom image when switching back to the business logo", () => {
    const onTemplateTextChange = jest.fn();
    const { result: logoSourceHook } = renderHook(() => useLogoSource("/uploads/2026-10/bob.png", onTemplateTextChange));

    act(() => logoSourceHook.current.selectLogoSource("BUSINESS_LOGO"));

    expect(logoSourceHook.current.logoSource).toBe("BUSINESS_LOGO");
    expect(onTemplateTextChange).toHaveBeenCalledWith("");
  });

  it("uploads a PNG and stores its upload path", async () => {
    uploadLogoFiles.mockResolvedValue([{ path: "/uploads/2026-10/eve.png" }]);
    const onTemplateTextChange = jest.fn();
    const { result: logoSourceHook } = renderHook(() => useLogoSource("", onTemplateTextChange));
    const logoFile = new File(["logo"], "eve.png", { type: "image/png" });

    await act(() => logoSourceHook.current.changeLogoImage(logoFile));

    expect(uploadLogoFiles).toHaveBeenCalledWith([logoFile]);
    expect(onTemplateTextChange).toHaveBeenCalledWith("/uploads/2026-10/eve.png");
  });

  it("clears the image when the uploader removes it", async () => {
    const onTemplateTextChange = jest.fn();
    const { result: logoSourceHook } = renderHook(() => useLogoSource("/uploads/2026-10/bob.png", onTemplateTextChange));

    await act(() => logoSourceHook.current.changeLogoImage(null));

    expect(onTemplateTextChange).toHaveBeenCalledWith("");
  });

  it("rejects image formats that cannot be printed and resets the uploader", async () => {
    const { result: logoSourceHook } = renderHook(() => useLogoSource("", jest.fn()));

    await act(() => logoSourceHook.current.changeLogoImage(new File(["logo"], "mallory.webp", { type: "image/webp" })));

    expect(uploadLogoFiles).not.toHaveBeenCalled();
    expect(logoSourceHook.current.uploadErrorKey).toBe("templates.logo.unsupportedFormat");
    expect(logoSourceHook.current.uploaderResetKey).toBe(1);
  });

  it("reports an upload failure", async () => {
    uploadLogoFiles.mockRejectedValue(new Error("fail"));
    const { result: logoSourceHook } = renderHook(() => useLogoSource("", jest.fn()));

    await act(() => logoSourceHook.current.changeLogoImage(new File(["logo"], "eve.png", { type: "image/png" })));

    expect(logoSourceHook.current.uploadErrorKey).toBe("templates.logo.uploadError");
  });
});
