const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relativeTime = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const monthYear = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

// Largest unit first: the first one whose span fits the elapsed time is used.
const units = [
  { unit: "year", size: 365 * DAY, from: 365 * DAY },
  { unit: "month", size: 30 * DAY, from: 30 * DAY },
  { unit: "week", size: 7 * DAY, from: 7 * DAY },
  { unit: "day", size: DAY, from: DAY },
  { unit: "hour", size: HOUR, from: HOUR },
  { unit: "minute", size: MINUTE, from: 45 * 1000 },
];

// "hace 2 días", "ayer", "hace 3 horas"... for a timestamp in ms, relative to
// `now`. Days count elapsed 24h periods, not calendar days. A future
// timestamp (clock skew between devices) reads as "ahora"; anything that is
// not a valid timestamp gives an empty label.
export function formatRelativeDate(timestamp, now = Date.now()) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "";
  const elapsed = now - timestamp;
  const match = units.find(({ from }) => elapsed >= from);
  if (!match) return "ahora";
  const amount = Math.max(1, Math.floor(elapsed / match.size));
  return relativeTime.format(-amount, match.unit);
}

// "Agosto 2026": capitalized month and year, without the "de" of the locale.
export function formatMonthYear(date) {
  const parts = monthYear.formatToParts(date);
  const month = parts.find((part) => part.type === "month").value;
  const year = parts.find((part) => part.type === "year").value;
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}
