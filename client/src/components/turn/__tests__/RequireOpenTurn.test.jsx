import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/turn/useTurn", () => ({
  useTurn: jest.fn(),
}));

jest.mock("../OpenTurnForm", () => ({
  __esModule: true,
  default: () => <div data-testid="open-turn-form" />,
}));

import { useTurn } from "@/hooks/turn/useTurn";

import RequireOpenTurn from "../RequireOpenTurn";

function setupMocks({ openTurn = null, loading = false } = {}) {
  useTurn.mockReturnValue({ openTurn, loading });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RequireOpenTurn", () => {
  describe("children rendering", () => {
    it("always renders children regardless of shift state", () => {
      setupMocks({ openTurn: null, loading: false });
      render(
        <RequireOpenTurn>
          <div data-testid="protected-content">Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("renders children even while loading", () => {
      setupMocks({ openTurn: null, loading: true });
      render(
        <RequireOpenTurn>
          <div data-testid="protected-content">Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });

  describe("modal visibility", () => {
    it("shows modal when loading=false and no shift is open", () => {
      setupMocks({ openTurn: null, loading: false });
      render(
        <RequireOpenTurn>
          <div>Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.getByText("requiredOpenShiftTitle")).toBeInTheDocument();
      expect(screen.getByText("requiredOpenShiftMessage")).toBeInTheDocument();
    });

    it("shows OpenTurnForm inside the modal", () => {
      setupMocks({ openTurn: null, loading: false });
      render(
        <RequireOpenTurn>
          <div>Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.getByTestId("open-turn-form")).toBeInTheDocument();
    });

    it("does not show modal while still loading (prevents flash)", () => {
      setupMocks({ openTurn: null, loading: true });
      render(
        <RequireOpenTurn>
          <div>Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.queryByText("requiredOpenShiftTitle")).not.toBeInTheDocument();
    });

    it("does not show modal when a shift is already open", () => {
      setupMocks({ openTurn: 5, loading: false });
      render(
        <RequireOpenTurn>
          <div>Content</div>
        </RequireOpenTurn>,
      );
      expect(screen.queryByText("requiredOpenShiftTitle")).not.toBeInTheDocument();
    });
  });
});
