import { render, screen, fireEvent } from "@testing-library/react";

import { TutorialsCard } from "../TutorialsCard";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
}));

const t = (key) => key;

function renderCard(props = {}) {
  return render(
    <TutorialsCard
      walletTourSeen={false}
      seedTourSeen={false}
      onReplayWallet={jest.fn()}
      onReplaySeed={jest.fn()}
      t={t}
      {...props}
    />,
  );
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

    it("renders the seed tour name and description", () => {
      renderCard();
      expect(screen.getByText("cardTours.seedTour.name")).toBeInTheDocument();
      expect(screen.getByText("cardTours.seedTour.description")).toBeInTheDocument();
    });

    it("renders two replay buttons", () => {
      renderCard();
      expect(screen.getAllByText("cardTours.replayButton")).toHaveLength(2);
    });
  });

  describe("Tour status badges", () => {
    it("shows two 'pending' badges when both tours unseen", () => {
      renderCard({ walletTourSeen: false, seedTourSeen: false });
      expect(screen.queryByText("cardTours.seen")).not.toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(2);
    });

    it("shows 'seen' for wallet when walletTourSeen is true", () => {
      renderCard({ walletTourSeen: true, seedTourSeen: false });
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(1);
    });

    it("shows 'seen' for seed when seedTourSeen is true", () => {
      renderCard({ walletTourSeen: false, seedTourSeen: true });
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(1);
    });

    it("renders 'seen' badge with green style", () => {
      renderCard({ walletTourSeen: true });
      expect(screen.getByText("cardTours.seen").className).toContain("bg-green-200");
    });

    it("renders 'pending' badge with amber style", () => {
      renderCard();
      expect(screen.getAllByText("cardTours.pending")[0].className).toContain("bg-amber-100");
    });
  });

  describe("Interaction", () => {
    it("calls onReplayWallet when wallet replay button is pressed", () => {
      const onReplayWallet = jest.fn();
      renderCard({ onReplayWallet });
      fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      expect(onReplayWallet).toHaveBeenCalledTimes(1);
    });

    it("calls onReplaySeed when seed replay button is pressed", () => {
      const onReplaySeed = jest.fn();
      renderCard({ onReplaySeed });
      fireEvent.click(screen.getAllByText("cardTours.replayButton")[1]);
      expect(onReplaySeed).toHaveBeenCalledTimes(1);
    });
  });
});
