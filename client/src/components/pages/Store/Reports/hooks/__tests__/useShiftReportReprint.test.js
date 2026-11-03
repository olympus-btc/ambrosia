import { addToast } from "@heroui/react";
import { act, renderHook } from "@testing-library/react";

import { useShiftReportReprint } from "@/components/pages/Store/Reports/hooks/useShiftReportReprint";
import { printShiftReport } from "@/services/shiftsService";

let mockCanPrintShiftReport;
let mockHasCustomerPrinter;
let mockLoadingConfigs;
const mockShiftReportLabels = { title: "Z REPORT" };

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@/services/shiftsService", () => ({
  printShiftReport: jest.fn(),
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanPrintShiftReport,
}));

jest.mock("@/hooks/useShiftReportLabels", () => ({
  useShiftReportLabels: () => mockShiftReportLabels,
}));

jest.mock("@/components/pages/Store/hooks/useHasCustomerPrinter", () => ({
  useHasCustomerPrinter: () => ({ hasCustomerPrinter: mockHasCustomerPrinter, loadingConfigs: mockLoadingConfigs }),
}));

const closedShift = { id: "shift-alice", endTime: "18:00:00" };

beforeEach(() => {
  jest.clearAllMocks();
  mockCanPrintShiftReport = true;
  mockHasCustomerPrinter = true;
  mockLoadingConfigs = false;
});

describe("useShiftReportReprint", () => {
  it("reprints the Z report of a closed shift with the translated labels", async () => {
    printShiftReport.mockResolvedValue(true);
    const { result: reprintHook } = renderHook(() => useShiftReportReprint(closedShift));

    await act(() => reprintHook.current.reprintShiftReport());

    expect(printShiftReport).toHaveBeenCalledWith("shift-alice", mockShiftReportLabels);
    expect(addToast).toHaveBeenCalledWith({ color: "success", description: "printCorteZSuccess" });
  });

  it("shows an error toast when the Z report cannot be printed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    printShiftReport.mockRejectedValue(new Error("printer offline"));
    const { result: reprintHook } = renderHook(() => useShiftReportReprint(closedShift));

    await act(() => reprintHook.current.reprintShiftReport());

    expect(addToast).toHaveBeenCalledWith({ color: "danger", description: "printCorteZError" });
    expect(reprintHook.current.isReprinting).toBe(false);
    console.error.mockRestore();
  });

  it("allows reprinting only closed shifts", () => {
    const { result: openShiftHook } = renderHook(() => useShiftReportReprint({ id: "shift-bob", endTime: null }));
    const { result: closedShiftHook } = renderHook(() => useShiftReportReprint(closedShift));

    expect(openShiftHook.current.canReprint).toBe(false);
    expect(closedShiftHook.current.canReprint).toBe(true);
  });

  it("does not allow reprinting without the shifts_create permission", async () => {
    mockCanPrintShiftReport = false;
    const { result: reprintHook } = renderHook(() => useShiftReportReprint(closedShift));

    await act(() => reprintHook.current.reprintShiftReport());

    expect(reprintHook.current.canReprint).toBe(false);
    expect(printShiftReport).not.toHaveBeenCalled();
  });

  it("does not allow reprinting without an enabled customer printer", () => {
    mockHasCustomerPrinter = false;
    const { result: reprintHook } = renderHook(() => useShiftReportReprint(closedShift));

    expect(reprintHook.current.canReprint).toBe(false);
  });
});
