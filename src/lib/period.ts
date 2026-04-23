function parseIsoDateParts(isoDate: string | Date) {
  if (isoDate instanceof Date) {
    return {
      year: isoDate.getUTCFullYear(),
      month: isoDate.getUTCMonth() + 1,
      day: isoDate.getUTCDate(),
    };
  }

  const normalizedDate = isoDate.slice(0, 10);
  const [year, month, day] = normalizedDate.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return { year, month, day };
}

const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function toIsoDate(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shiftIsoDateByYears(isoDate: string, yearOffset: number) {
  const { year, month, day } = parseIsoDateParts(isoDate);
  const targetYear = year + yearOffset;
  const safeDay = Math.min(day, getDaysInMonth(targetYear, month));

  return toIsoDate(targetYear, month, safeDay);
}

export function getPreviousYearRange(startDate: string, endDate: string) {
  return {
    startDate: shiftIsoDateByYears(startDate, -1),
    endDate: shiftIsoDateByYears(endDate, -1),
  };
}

export function formatDateLabel(isoDate: string | Date) {
  const { year, month, day } = parseIsoDateParts(isoDate);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateRangeLabel(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDateLabel(startDate);
  }

  return `${formatDateLabel(startDate)} a ${formatDateLabel(endDate)}`;
}

export function spansMultipleCalendarYears(startDate: string, endDate: string) {
  return parseIsoDateParts(startDate).year !== parseIsoDateParts(endDate).year;
}

export function formatMonthBucketLabel(
  isoDate: string | Date,
  includeYear = false
) {
  const { year, month } = parseIsoDateParts(isoDate);
  const monthLabel = SHORT_MONTHS[month - 1];

  return includeYear ? `${monthLabel}/${String(year).slice(2)}` : monthLabel;
}
