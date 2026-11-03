import { render, screen } from "@testing-library/react";

import { ElementShiftSummary } from "@/components/pages/Store/Settings/TicketTemplates/TicketElements/ElementShiftSummary";
import { sampleShiftReport } from "@/components/pages/Store/Settings/TicketTemplates/TicketElements/sampleData";

const previewShiftReport = {
  ...sampleShiftReport,
  labels: {
    title: "Z REPORT",
    cashier: "Cashier",
    openedAt: "Opened",
    closedAt: "Closed",
    tickets: "Tickets",
    totalSales: "Sales",
    tips: "Tips",
    initialAmount: "Opening cash",
    cashSales: "Cash sales",
    cashRefunds: "Cash refunds",
    expectedCash: "Expected cash",
    countedCash: "Counted cash",
    difference: "Difference",
    paymentMethods: { cash: "Cash payments" },
  },
};

function Wrapper({ templateText = "" }) {
  return (
    <div>
      {ElementShiftSummary({
        localId: "shift-summary",
        templateText,
        businessConfig: null,
        printFormats: { dateFormat: "DAY_MONTH_YEAR", timeFormat: "HOURS_24" },
        sampleShiftReport: previewShiftReport,
        className: "",
      })}
    </div>
  );
}

describe("ElementShiftSummary", () => {
  it("renders the translated title, cashier and shift times in the template formats", () => {
    render(<Wrapper />);

    expect(screen.getByText("Z REPORT")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("10/01/2024 08:00")).toBeInTheDocument();
    expect(screen.getByText("10/01/2024 18:05")).toBeInTheDocument();
  });

  it("translates known payment methods and keeps unknown names", () => {
    render(<Wrapper />);

    expect(screen.getByText("Cash payments")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
  });

  it("renders the cash block", () => {
    render(<Wrapper />);

    expect(screen.getByText("Expected cash")).toBeInTheDocument();
    expect(screen.getByText("390")).toBeInTheDocument();
    expect(screen.getByText("-10")).toBeInTheDocument();
  });

  it("uses the element value as the title when it is set", () => {
    render(<Wrapper templateText="Cash count" />);

    expect(screen.getByText("Cash count")).toBeInTheDocument();
  });
});
