import { fireEvent, render, screen, within } from "@testing-library/react";

import { LogLevelsGuide } from "../LogLevelsGuide";

const CONFIGURABLE_SERVER_LOG_LEVELS = ["ERROR", "WARN", "INFO", "DEBUG"];

describe("LogLevelsGuide", () => {
  it("starts collapsed and opens when the title is clicked", () => {
    render(<LogLevelsGuide />);
    const logLevelsGuide = screen.getByTestId("log-levels-guide");

    expect(logLevelsGuide).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("cardLogs.levelsGuide.title"));

    expect(logLevelsGuide).toHaveAttribute("open");
  });

  it("explains every configurable level in order", () => {
    render(<LogLevelsGuide />);

    const levelDescriptionTexts = screen
      .getAllByRole("definition", { hidden: true })
      .map((levelDescriptionElement) => levelDescriptionElement.textContent);
    expect(levelDescriptionTexts).toEqual(
      CONFIGURABLE_SERVER_LOG_LEVELS.map(
        (configurableServerLogLevel) => `cardLogs.levelsGuide.levelDescriptions.${configurableServerLogLevel}`,
      ),
    );
  });

  it("marks only INFO as the recommended level", () => {
    render(<LogLevelsGuide />);

    const recommendedLevelTerms = screen
      .getAllByRole("term", { hidden: true })
      .filter((levelTermElement) => within(levelTermElement).queryByText("cardLogs.levelsGuide.recommended"));
    expect(recommendedLevelTerms).toHaveLength(1);
    expect(within(recommendedLevelTerms[0]).getByText("INFO")).toBeInTheDocument();
  });
});
