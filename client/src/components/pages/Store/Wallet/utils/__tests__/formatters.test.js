import * as heroui from "@heroui/react";

import { formatSats, copyToClipboard } from "../formatters";

// Mock addToast from @heroui/react
jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

describe("formatSats", () => {
  it("formats numbers with thousand separators", () => {
    expect(formatSats(1000)).toBe("1,000");
  });

  it("formats large numbers correctly", () => {
    expect(formatSats(1000000)).toBe("1,000,000");
  });

  it("formats small numbers without separators", () => {
    expect(formatSats(100)).toBe("100");
  });

  it("formats zero correctly", () => {
    expect(formatSats(0)).toBe("0");
  });

  it("handles decimal numbers", () => {
    const result = formatSats(1000.5);
    expect(result).toBe("1,000.5");
  });

  it("handles negative numbers", () => {
    const result = formatSats(-1000);
    expect(result).toBe("-1,000");
  });

  it("handles very large numbers", () => {
    expect(formatSats(1000000000)).toBe("1,000,000,000");
  });
});

describe("copyToClipboard", () => {
  let originalClipboard;
  let mockT;

  beforeEach(() => {
    // Store original clipboard
    originalClipboard = global.navigator.clipboard;

    // Mock translation function
    mockT = jest.fn((key) => key);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock document.execCommand
    document.execCommand = jest.fn(() => true);
  });

  afterEach(() => {
    // Restore original clipboard
    global.navigator.clipboard = originalClipboard;
  });

  describe("with modern Clipboard API", () => {
    beforeEach(() => {
      // Mock modern clipboard API
      global.navigator.clipboard = {
        writeText: jest.fn(() => Promise.resolve()),
      };
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
      global.navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error("Failed")));

      await copyToClipboard("test-text", mockT);

      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });
  });

  describe("with fallback method", () => {
    beforeEach(() => {
      // Remove clipboard API to force fallback
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
      document.execCommand = jest.fn(() => {
        throw new Error("Copy failed");
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await copyToClipboard("test-text", mockT);

      expect(heroui.addToast).toHaveBeenCalledWith({
        title: "clipboard.errorTitle",
        description: "clipboard.errorDescription",
        variant: "solid",
        color: "danger",
      });

      consoleErrorSpy.mockRestore();
    });

    it("sets textarea to fixed position", async () => {
      const appendChildSpy = jest.spyOn(document.body, "appendChild");

      await copyToClipboard("test-text", mockT);

      const textarea = appendChildSpy.mock.calls[0][0];
      expect(textarea.style.position).toBe("fixed");

      appendChildSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      global.navigator.clipboard = {
        writeText: jest.fn(() => Promise.resolve()),
      };
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
