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
      onReplay={jest.fn()}
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

    it("renders the replay button", () => {
      renderCard();
      expect(screen.getByText("cardTours.replayButton")).toBeInTheDocument();
    });
  });

  describe("Tour status badge", () => {
    it("shows 'pending' badge when walletTourSeen is false", () => {
      renderCard({ walletTourSeen: false });
      expect(screen.getByText("cardTours.pending")).toBeInTheDocument();
      expect(screen.queryByText("cardTours.seen")).not.toBeInTheDocument();
    });

    it("shows 'seen' badge when walletTourSeen is true", () => {
      renderCard({ walletTourSeen: true });
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.queryByText("cardTours.pending")).not.toBeInTheDocument();
    });

    it("renders 'seen' badge with green style", () => {
      renderCard({ walletTourSeen: true });
      expect(screen.getByText("cardTours.seen").className).toContain("bg-green-200");
    });

    it("renders 'pending' badge with amber style", () => {
      renderCard({ walletTourSeen: false });
      expect(screen.getByText("cardTours.pending").className).toContain("bg-amber-100");
    });
  });

  describe("Interaction", () => {
    it("calls onReplay when replay button is pressed", () => {
      const onReplay = jest.fn();
      renderCard({ onReplay });
      fireEvent.click(screen.getByText("cardTours.replayButton"));
      expect(onReplay).toHaveBeenCalledTimes(1);
    });
  });
});
