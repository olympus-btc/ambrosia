import * as heroui from "@heroui/react";

import { copyToClipboard } from "../copyToClipboard";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

describe("copyToClipboard", () => {
  let originalClipboard;
  let mockT;

  beforeEach(() => {
    originalClipboard = global.navigator.clipboard;
    mockT = jest.fn((key) => key);
    jest.clearAllMocks();

    document.execCommand = jest.fn(() => true);
  });

  afterEach(() => {
    global.navigator.clipboard = originalClipboard;
  });

  describe("with modern Clipboard API", () => {
    beforeEach(() => {
      global.navigator.clipboard = {
        writeText: jest.fn(() => Promise.resolve()),
      };
      Object.defineProperty(window, "isSecureContext", { value: true, writable: true, configurable: true });
    });

    it("copies text using navigator.clipboard.writeText", async () => {
      await copyToClipboard("test-text", mockT);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test-text");
    });

    it("shows success toast on successful copy", async () => {
      await copyToClipboard("test-text", mockT);

      expect(heroui.addToast).toHaveBeenCalledWith({
        title: "clipboard.successTitle",
        description: "clipboard.successDescription",
        variant: "solid",
        color: "success",
      });
    });

    it("falls back to execCommand when clipboard API fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      global.navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error("Failed")));

      await copyToClipboard("test-text", mockT);

      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });
  });

  describe("with fallback method", () => {
    beforeEach(() => {
      global.navigator.clipboard = undefined;
    });

    it("uses fallback method when clipboard API not available", async () => {
      await copyToClipboard("fallback-text", mockT);

      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });

    it("creates and removes textarea element", async () => {
      const appendChildSpy = jest.spyOn(document.body, "appendChild");
      const removeChildSpy = jest.spyOn(document.body, "removeChild");

      await copyToClipboard("test-text", mockT);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      const textarea = appendChildSpy.mock.calls[0][0];
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea.value).toBe("test-text");

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("shows success toast on successful fallback copy", async () => {
      document.execCommand = jest.fn(() => true);

      await copyToClipboard("test-text", mockT);

      expect(heroui.addToast).toHaveBeenCalledWith({
        title: "clipboard.successTitle",
        description: "clipboard.successDescription",
        variant: "solid",
        color: "success",
      });
    });

    it("shows error toast when fallback copy fails", async () => {
      document.execCommand = jest.fn(() => false);

      await copyToClipboard("test-text", mockT);

      expect(heroui.addToast).toHaveBeenCalledWith({
        title: "clipboard.errorTitle",
        description: "clipboard.errorDescription",
        variant: "solid",
        color: "danger",
      });
    });

    it("sets textarea off-screen via className", async () => {
      const appendChildSpy = jest.spyOn(document.body, "appendChild");

      await copyToClipboard("test-text", mockT);

      const textarea = appendChildSpy.mock.calls[0][0];
      expect(textarea.className).toContain("absolute");
      expect(textarea.className).toContain("-left-[9999px]");

      appendChildSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      global.navigator.clipboard = {
        writeText: jest.fn(() => Promise.resolve()),
      };
      Object.defineProperty(window, "isSecureContext", { value: true, writable: true, configurable: true });
    });

    it("handles empty string", async () => {
      await copyToClipboard("", mockT);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
    });

    it("handles very long text", async () => {
      const longText = "a".repeat(10000);
      await copyToClipboard(longText, mockT);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(longText);
    });

    it("handles special characters", async () => {
      const specialText = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      await copyToClipboard(specialText, mockT);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(specialText);
    });

    it("handles unicode characters", async () => {
      const unicodeText = "Hello 世界 🌍";
      await copyToClipboard(unicodeText, mockT);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(unicodeText);
    });
  });
});
