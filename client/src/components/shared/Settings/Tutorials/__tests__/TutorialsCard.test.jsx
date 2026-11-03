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

const settingsTranslations = (translationKey) => translationKey;

function buildTutorialTour(tourName, translationKey, tutorialTourOverrides = {}) {
  return { tourName, translationKey, isSeen: false, onReplay: jest.fn(), ...tutorialTourOverrides };
}

function renderCard({ walletTour = {}, seedTour = {}, tutorialTours } = {}) {
  return render(
    <TutorialsCard
      tutorialTours={tutorialTours ?? [
        buildTutorialTour("wallet", "walletTour", walletTour),
        buildTutorialTour("seed", "seedTour", seedTour),
      ]}
      settingsTranslations={settingsTranslations}
    />,
  );
}

describe("TutorialsCard", () => {
  describe("Rendering", () => {
    it("renders the card title", () => {
      renderCard();
      expect(screen.getByText("cardTours.title")).toBeInTheDocument();
    });

    it("renders only the tours it receives", () => {
      renderCard({ tutorialTours: [buildTutorialTour("seed", "seedTour")] });
      expect(screen.getByText("cardTours.seedTour.name")).toBeInTheDocument();
      expect(screen.queryByText("cardTours.walletTour.name")).not.toBeInTheDocument();
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

    it("renders one replay button per tour", () => {
      renderCard();
      expect(screen.getAllByText("cardTours.replayButton")).toHaveLength(2);
    });
  });

  describe("Tour status badges", () => {
    it("shows two 'pending' badges when both tours unseen", () => {
      renderCard();
      expect(screen.queryByText("cardTours.seen")).not.toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(2);
    });

    it("shows 'seen' for the wallet tour when it was seen", () => {
      renderCard({ walletTour: { isSeen: true } });
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(1);
    });

    it("shows 'seen' for the seed tour when it was seen", () => {
      renderCard({ seedTour: { isSeen: true } });
      expect(screen.getByText("cardTours.seen")).toBeInTheDocument();
      expect(screen.getAllByText("cardTours.pending")).toHaveLength(1);
    });

    it("renders 'seen' badge with green style", () => {
      renderCard({ walletTour: { isSeen: true } });
      expect(screen.getByText("cardTours.seen").className).toContain("bg-green-200");
    });

    it("renders 'pending' badge with amber style", () => {
      renderCard();
      expect(screen.getAllByText("cardTours.pending")[0].className).toContain("bg-amber-100");
    });
  });

  describe("Interaction", () => {
    it("replays the wallet tour when its replay button is pressed", () => {
      const replayWalletTour = jest.fn();
      renderCard({ walletTour: { onReplay: replayWalletTour } });
      fireEvent.click(screen.getAllByText("cardTours.replayButton")[0]);
      expect(replayWalletTour).toHaveBeenCalledTimes(1);
    });

    it("replays the seed tour when its replay button is pressed", () => {
      const replaySeedTour = jest.fn();
      renderCard({ seedTour: { onReplay: replaySeedTour } });
      fireEvent.click(screen.getAllByText("cardTours.replayButton")[1]);
      expect(replaySeedTour).toHaveBeenCalledTimes(1);
    });
  });
});
