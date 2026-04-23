import { render, screen, act, fireEvent } from "@testing-library/react";

import { Tutorials } from "../Tutorials";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";
const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";
const SEED_SEEN_KEY = "ambrosia:tour:seed-seen";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

function renderTutorials(props = {}) {
  return render(<Tutorials onNavigate={jest.fn()} {...props} />);
}

describe("Tutorials", () => {
  describe("Initial state", () => {
    it("shows 'pending' for wallet when WALLET_TOUR_KEY is absent", () => {
      renderTutorials();
      expect(screen.getAllByText("cardTours.pending")[0]).toBeInTheDocument();
    });

    it("shows 'seen' for wallet when WALLET_TOUR_KEY is visited", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "visited");
      renderTutorials();
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
    });

    it("shows 'pending' for wallet when WALLET_TOUR_KEY is only started (not completed)", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderTutorials();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(2);
    });

    it("shows 'pending' for seed when SEED_SEEN_KEY is absent", () => {
      renderTutorials();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(2);
    });

    it("shows 'seen' for seed when SEED_SEEN_KEY is present", () => {
      localStorage.setItem(SEED_SEEN_KEY, "true");
      renderTutorials();
      expect(screen.getAllByText("cardTours.seen")).toHaveLength(1);
    });

    it("updates seed status to seen when seed-tour:seen event fires", () => {
      renderTutorials();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(2);
      act(() => {
        window.dispatchEvent(new Event("seed-tour:seen"));
      });
      expect(screen.getAllByText("cardTours.seen")).toHaveLength(1);
    });
  });

  describe("Wallet replay action", () => {
    it("sets WALLET_TOUR_KEY to 'true' when wallet replay is pressed", async () => {
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      });
      expect(localStorage.getItem(WALLET_TOUR_KEY)).toBe("true");
    });

    it("sets SEED_TOUR_KEY to 'true' when wallet replay is pressed (prevents seed tour re-run)", async () => {
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      });
      expect(localStorage.getItem("ambrosia:tour:seed")).toBe("true");
    });

    it("clears WALLET_GUARD_TOUR_KEY when wallet replay is pressed", async () => {
      localStorage.setItem(WALLET_GUARD_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      });
      expect(localStorage.getItem(WALLET_GUARD_TOUR_KEY)).toBeNull();
    });

    it("clears WALLET_RECEIVE_TOUR_KEY when wallet replay is pressed", async () => {
      localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      });
      expect(localStorage.getItem(WALLET_RECEIVE_TOUR_KEY)).toBeNull();
    });

    it("calls onNavigate with /store when wallet replay is pressed", async () => {
      const onNavigate = jest.fn();
      renderTutorials({ onNavigate });
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      });
      expect(onNavigate).toHaveBeenCalledWith("/store");
    });
  });

  describe("Seed replay action", () => {
    it("clears SEED_TOUR_KEY when seed replay is pressed", async () => {
      localStorage.setItem("ambrosia:tour:seed", "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[1]);
      });
      expect(localStorage.getItem("ambrosia:tour:seed")).toBeNull();
    });

    it("clears SEED_SETTINGS_TOUR_KEY when seed replay is pressed", async () => {
      localStorage.setItem(SEED_SETTINGS_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[1]);
      });
      expect(localStorage.getItem(SEED_SETTINGS_TOUR_KEY)).toBeNull();
    });

    it("calls onNavigate with /store when seed replay is pressed", async () => {
      const onNavigate = jest.fn();
      renderTutorials({ onNavigate });
      await act(async () => {
        fireEvent.click(screen.getAllByText("cardTours.replayButton")[1]);
      });
      expect(onNavigate).toHaveBeenCalledWith("/store");
    });
  });
});
