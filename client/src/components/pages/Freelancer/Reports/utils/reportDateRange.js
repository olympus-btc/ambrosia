import { formatLocalDateStamp } from "../../../Store/Reports/utils/formatLocalDateStamp";

const DAYS_FROM_MONDAY_BY_WEEKDAY = [6, 0, 1, 2, 3, 4, 5];

function getPeriodStartDate(period, today) {
  const periodStartDate = new Date(today);

  if (period === "week") periodStartDate.setDate(today.getDate() - DAYS_FROM_MONDAY_BY_WEEKDAY[today.getDay()]);
  if (period === "month") periodStartDate.setDate(1);
  if (period === "year") periodStartDate.setMonth(0, 1);

  return periodStartDate;
}

export function resolveReportDateRange(reportQuery, today = new Date()) {
  if (reportQuery?.period) {
    return {
      from: formatLocalDateStamp(getPeriodStartDate(reportQuery.period, today)),
      to: formatLocalDateStamp(today),
    };
  }

  if (reportQuery?.startDate && reportQuery?.endDate) {
    return { from: reportQuery.startDate, to: reportQuery.endDate };
  }

  return null;
}
