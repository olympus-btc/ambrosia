import { fireEvent, render, screen } from "@testing-library/react";

import { TimeEntryCard } from "../TimeEntryCard";

const timeEntry = {
  id: "time-entry-id",
  projectName: "Website",
  taskName: "Development",
  description: "Landing page",
  durationMinutes: 90,
  isLocked: false,
};

function renderTimeEntryCard(timeEntryCardPropOverrides = {}) {
  const timeEntryCardCallbacks = { onView: jest.fn() };
  render(<TimeEntryCard timeEntry={timeEntry} {...timeEntryCardCallbacks} {...timeEntryCardPropOverrides} />);
  return timeEntryCardCallbacks;
}

describe("TimeEntryCard", () => {
  it("shows only the task and the formatted duration", () => {
    renderTimeEntryCard();

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByTestId("time-entry-duration")).toHaveTextContent("1:30");
    expect(screen.queryByText("Website")).not.toBeInTheDocument();
    expect(screen.queryByText("Landing page")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("opens the details when the entry is clicked", () => {
    const { onView } = renderTimeEntryCard();

    fireEvent.click(screen.getByText("Development"));

    expect(onView).toHaveBeenCalledWith(timeEntry);
  });

  describe("locked entry", () => {
    const lockedTimeEntry = { ...timeEntry, isLocked: true };

    it("shows the lock indicator", () => {
      renderTimeEntryCard({ timeEntry: lockedTimeEntry });

      expect(screen.getByLabelText("lockedEntry")).toBeInTheDocument();
      expect(screen.getByTestId("time-entry-card")).toHaveAttribute("data-locked", "true");
    });

    it("still opens the details", () => {
      const { onView } = renderTimeEntryCard({ timeEntry: lockedTimeEntry });

      fireEvent.click(screen.getByText("Development"));

      expect(onView).toHaveBeenCalledWith(lockedTimeEntry);
    });
  });
});
