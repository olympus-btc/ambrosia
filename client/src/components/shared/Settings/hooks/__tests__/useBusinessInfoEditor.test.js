import { act, renderHook } from "@testing-library/react";

import * as useUploadHook from "@components/hooks/useUpload";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { useBusinessInfoEditor } from "../useBusinessInfoEditor";

const mockUpdateConfig = jest.fn();
const mockUpload = jest.fn();
const aliceConfig = { businessName: "Alice Studio", businessLogoUrl: "/assets/alice-logo.png" };

function renderBusinessInfoEditor() {
  return renderHook(() => useBusinessInfoEditor());
}

describe("useBusinessInfoEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateConfig.mockResolvedValue({});
    jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({ config: aliceConfig, updateConfig: mockUpdateConfig });
    jest.spyOn(useUploadHook, "useUpload").mockReturnValue({ upload: mockUpload });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens the editor with a draft of the current configuration", () => {
    const { result: businessInfoEditor } = renderBusinessInfoEditor();

    act(() => businessInfoEditor.current.openEditor());

    expect(businessInfoEditor.current.isEditorOpen).toBe(true);
    expect(businessInfoEditor.current.draftBusinessInfo).toEqual(aliceConfig);
  });

  it("closes the editor without saving", () => {
    const { result: businessInfoEditor } = renderBusinessInfoEditor();

    act(() => businessInfoEditor.current.openEditor());
    act(() => businessInfoEditor.current.closeEditor());

    expect(businessInfoEditor.current.isEditorOpen).toBe(false);
    expect(mockUpdateConfig).not.toHaveBeenCalled();
  });

  it("uploads a new logo, saves its url and closes the editor", async () => {
    mockUpload.mockResolvedValue([{ url: "/assets/bob-logo.png" }]);
    const bobLogo = new File(["logo"], "bob-logo.png", { type: "image/png" });
    const { result: businessInfoEditor } = renderBusinessInfoEditor();

    act(() => businessInfoEditor.current.openEditor());
    act(() => businessInfoEditor.current.handleDraftChange({ businessLogo: bobLogo }));
    await act(() => businessInfoEditor.current.saveBusinessInfo());

    expect(mockUpload).toHaveBeenCalledWith([bobLogo]);
    expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ businessLogoUrl: "/assets/bob-logo.png" }));
    expect(businessInfoEditor.current.isEditorOpen).toBe(false);
  });

  it("saves a null logo url when the logo was removed", async () => {
    const { result: businessInfoEditor } = renderBusinessInfoEditor();

    act(() => businessInfoEditor.current.openEditor());
    act(() => businessInfoEditor.current.handleDraftChange({ businessLogo: null, businessLogoRemoved: true }));
    await act(() => businessInfoEditor.current.saveBusinessInfo());

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ businessLogoUrl: null }));
  });

  it("keeps the editor open and rethrows the error when saving fails", async () => {
    mockUpdateConfig.mockRejectedValue(new Error("Server down"));
    const { result: businessInfoEditor } = renderBusinessInfoEditor();

    act(() => businessInfoEditor.current.openEditor());
    await act(async () => {
      await expect(businessInfoEditor.current.saveBusinessInfo()).rejects.toThrow("Server down");
    });

    expect(businessInfoEditor.current.isEditorOpen).toBe(true);
  });
});
