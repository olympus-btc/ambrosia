import { render, screen } from "@testing-library/react";

import { NodeError } from "../NodeError";

function renderNodeError(error) {
  return render(<NodeError error={error} />);
}

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
       args[0].includes("Unknown event handler property") ||
       args[0].includes("validateDOMNesting"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("NodeError Component", () => {
  describe("Rendering", () => {
    it("renders error message", () => {
      const errorMessage = "Failed to connect to phoenixd";
      renderNodeError(errorMessage);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("displays alert icon", () => {
      const { container } = renderNodeError("Test error");

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("lucide");
    });
  });

  describe("Styling", () => {
    it("has red background", () => {
      const { container } = renderNodeError("Test error");

      const card = container.querySelector(".bg-red-50");
      expect(card).toBeInTheDocument();
    });

    it("has red border", () => {
      const { container } = renderNodeError("Test error");

      const card = container.querySelector(".border-red-200");
      expect(card).toBeInTheDocument();
    });

    it("has red text color", () => {
      renderNodeError("Test error");

      const errorText = screen.getByText("Test error");
      expect(errorText).toHaveClass("text-red-600");
    });

    it("has semibold font weight", () => {
      renderNodeError("Test error");

      const errorText = screen.getByText("Test error");
      expect(errorText).toHaveClass("font-semibold");
    });
  });

  describe("Different Error Messages", () => {
    it("handles short error messages", () => {
      renderNodeError("Error");

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("handles long error messages", () => {
      const longError = "Connection to phoenixd failed: Unable to establish connection to the Lightning node. Please check that phoenixd is running and accessible.";
      renderNodeError(longError);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it("handles error messages with special characters", () => {
      const specialError = "Error: Node not found (404) - /api/v1/info";
      renderNodeError(specialError);

      expect(screen.getByText(specialError)).toBeInTheDocument();
    });

    it("handles empty string", () => {
      const { container } = renderNodeError("");

      const errorText = container.querySelector(".text-red-600.font-semibold");
      expect(errorText).toBeInTheDocument();
      expect(errorText.textContent).toBe("");
    });
  });

  describe("Layout", () => {
    it("displays icon and text in flex layout", () => {
      const { container } = renderNodeError("Test error");

      const flexContainer = container.querySelector(".flex.items-center");
      expect(flexContainer).toBeInTheDocument();
    });

    it("has spacing between icon and text", () => {
      const { container } = renderNodeError("Test error");

      const flexContainer = container.querySelector(".space-x-2");
      expect(flexContainer).toBeInTheDocument();
    });

    it("has bottom margin on card", () => {
      const { container } = renderNodeError("Test error");

      const card = container.querySelector(".mb-6");
      expect(card).toBeInTheDocument();
    });
  });
});
