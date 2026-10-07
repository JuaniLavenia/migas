import { describe, expect, it } from "vitest";
import { formatMonthYear, formatRelativeDate } from "./dates";

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeDate", () => {
  it.each([
    ["now", NOW, "ahora"],
    ["a few seconds ago", NOW - 20 * 1000, "ahora"],
    ["one minute ago", NOW - MINUTE, "hace 1 minuto"],
    ["minutes ago", NOW - 25 * MINUTE, "hace 25 minutos"],
    ["one hour ago", NOW - HOUR, "hace 1 hora"],
    ["hours ago", NOW - 5 * HOUR, "hace 5 horas"],
    ["one day ago", NOW - DAY, "ayer"],
    ["two days ago", NOW - 2 * DAY, "anteayer"],
    ["days ago", NOW - 3 * DAY, "hace 3 días"],
    ["weeks ago", NOW - 15 * DAY, "hace 2 semanas"],
    ["months ago", NOW - 70 * DAY, "hace 2 meses"],
    ["years ago", NOW - 800 * DAY, "hace 2 años"],
  ])("formats %s", (_label, timestamp, expected) => {
    expect(formatRelativeDate(timestamp, NOW)).toBe(expected);
  });

  it("treats a future timestamp (clock skew) as now", () => {
    expect(formatRelativeDate(NOW + 3 * HOUR, NOW)).toBe("ahora");
  });

  it.each([undefined, null, "Hoy", NaN])(
    "returns an empty label for %s",
    (timestamp) => {
      expect(formatRelativeDate(timestamp, NOW)).toBe("");
    },
  );
});

describe("formatMonthYear", () => {
  it("formats a capitalized Spanish month and the year", () => {
    expect(formatMonthYear(new Date(2026, 7, 15))).toBe("Agosto 2026");
    expect(formatMonthYear(new Date(2027, 0, 1))).toBe("Enero 2027");
  });
});
