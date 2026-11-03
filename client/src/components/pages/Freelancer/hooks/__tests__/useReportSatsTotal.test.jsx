import { render, screen, waitFor } from "@testing-library/react";

import { calculateReportTotalSatoshis } from "../../Reports/utils/reportSatoshis";
import { useReportSatsTotal } from "../useReportSatsTotal";

jest.mock("@/services/bitcoinPriceService", () => jest.fn().mockImplementation(() => ({
  getBitcoinPrice: jest.fn(),
})));

jest.mock("../../Reports/utils/reportSatoshis", () => ({
  calculateReportTotalSatoshis: jest.fn(),
}));

const currencyGroups = [{ currencyAcronym: "USD", totalAmountCents: 25000 }];

function ReportSatsTotalHookTestComponent({ reportCurrencyGroups }) {
  const { totalSatoshis, loading, unavailable } = useReportSatsTotal(reportCurrencyGroups);

  return (
    <div>
      <span data-testid="total-satoshis">{totalSatoshis ?? ""}</span>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="unavailable">{unavailable ? "yes" : "no"}</span>
    </div>
  );
}

describe("useReportSatsTotal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates the sats total of the report currencies", async () => {
    calculateReportTotalSatoshis.mockResolvedValueOnce(250000);

    render(<ReportSatsTotalHookTestComponent reportCurrencyGroups={currencyGroups} />);

    expect(screen.getByTestId("loading")).toHaveTextContent("yes");
    await waitFor(() => expect(screen.getByTestId("total-satoshis")).toHaveTextContent("250000"));
    expect(screen.getByTestId("loading")).toHaveTextContent("no");
    expect(calculateReportTotalSatoshis).toHaveBeenCalledWith(currencyGroups, expect.any(Function));
  });

  it("marks the total as unavailable when a price fails", async () => {
    calculateReportTotalSatoshis.mockRejectedValueOnce(new Error("Unable to get BTC price"));

    render(<ReportSatsTotalHookTestComponent reportCurrencyGroups={currencyGroups} />);

    await waitFor(() => expect(screen.getByTestId("unavailable")).toHaveTextContent("yes"));
    expect(screen.getByTestId("total-satoshis")).toHaveTextContent("");
  });

  it("skips the calculation without currencies", () => {
    render(<ReportSatsTotalHookTestComponent reportCurrencyGroups={[]} />);

    expect(screen.getByTestId("loading")).toHaveTextContent("no");
    expect(calculateReportTotalSatoshis).not.toHaveBeenCalled();
  });
});
