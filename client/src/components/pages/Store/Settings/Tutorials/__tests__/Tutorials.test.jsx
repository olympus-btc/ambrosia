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
    it("shows 'pending' when WALLET_TOUR_KEY is absent", () => {
      renderTutorials();
      expect(screen.getByText("cardTours.pending")).toBeInTheDocument();
    });

    it("shows 'seen' when WALLET_TOUR_KEY is present", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderTutorials();
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
    });
  });

  describe("Replay action", () => {
    it("clears WALLET_TOUR_KEY when replay is pressed", async () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });
      expect(localStorage.getItem(WALLET_TOUR_KEY)).toBeNull();
    });

    it("clears WALLET_GUARD_TOUR_KEY when replay is pressed", async () => {
      localStorage.setItem(WALLET_GUARD_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });
      expect(localStorage.getItem(WALLET_GUARD_TOUR_KEY)).toBeNull();
    });

    it("clears WALLET_RECEIVE_TOUR_KEY when replay is pressed", async () => {
      localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");
      renderTutorials();
      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });
      expect(localStorage.getItem(WALLET_RECEIVE_TOUR_KEY)).toBeNull();
    });

    it("calls onNavigate with /store when replay is pressed", async () => {
      const onNavigate = jest.fn();
      renderTutorials({ onNavigate });
      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });
      expect(onNavigate).toHaveBeenCalledWith("/store");
    });
  });
});
