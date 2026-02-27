import { render, screen, act, fireEvent } from "@testing-library/react";

import { TutorialsCard } from "../Tutorials/TutorialsCard";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
}));

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

const t = (key) => key;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

function renderCard(props = {}) {
  return render(<TutorialsCard t={t} {...props} />);
}

describe("TutorialsCard", () => {
  describe("Rendering", () => {
    it("renders the card title", () => {
      renderCard();
      expect(screen.getByText("cardTours.title")).toBeInTheDocument();
    });

    it("renders the subtitle", () => {
      renderCard();
      expect(screen.getByText("cardTours.subtitle")).toBeInTheDocument();
    });

    it("renders the wallet tour name and description", () => {
      renderCard();
      expect(screen.getByText("cardTours.walletTour.name")).toBeInTheDocument();
      expect(screen.getByText("cardTours.walletTour.description")).toBeInTheDocument();
    });

    it("renders the replay button", () => {
      renderCard();
      expect(screen.getByText("cardTours.replayButton")).toBeInTheDocument();
    });
  });

  describe("Tour status badge", () => {
    it("shows 'pending' badge when WALLET_TOUR_KEY is absent from localStorage", () => {
      renderCard();
      expect(screen.getByText("cardTours.pending")).toBeInTheDocument();
      expect(screen.queryByText("cardTours.seen")).not.toBeInTheDocument();
    });

    it("shows 'seen' badge when WALLET_TOUR_KEY is present in localStorage", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderCard();
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.queryByText("cardTours.pending")).not.toBeInTheDocument();
    });

    it("renders 'seen' badge with green style", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderCard();
      expect(screen.getByText("cardTours.seen").className).toContain("bg-green-200");
    });

    it("renders 'pending' badge with amber style", () => {
      renderCard();
      expect(screen.getByText("cardTours.pending").className).toContain("bg-amber-100");
    });
  });

  describe("Replay action", () => {
    it("clears WALLET_TOUR_KEY from localStorage when replay is pressed", async () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderCard({ onNavigate: jest.fn() });

      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });

      expect(localStorage.getItem(WALLET_TOUR_KEY)).toBeNull();
    });

    it("clears WALLET_GUARD_TOUR_KEY from localStorage when replay is pressed", async () => {
      localStorage.setItem(WALLET_GUARD_TOUR_KEY, "true");
      renderCard({ onNavigate: jest.fn() });

      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });

      expect(localStorage.getItem(WALLET_GUARD_TOUR_KEY)).toBeNull();
    });

    it("clears WALLET_RECEIVE_TOUR_KEY from localStorage when replay is pressed", async () => {
      localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");
      renderCard({ onNavigate: jest.fn() });

      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });

      expect(localStorage.getItem(WALLET_RECEIVE_TOUR_KEY)).toBeNull();
    });

    it("calls onNavigate with /store when replay is pressed", async () => {
      const onNavigate = jest.fn();
      renderCard({ onNavigate });

      await act(async () => {
        fireEvent.click(screen.getByText("cardTours.replayButton"));
      });

      expect(onNavigate).toHaveBeenCalledWith("/store");
    });
  });
});
