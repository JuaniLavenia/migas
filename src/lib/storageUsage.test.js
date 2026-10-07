import { describe, expect, it } from "vitest";
import { formatBytes, isNearQuota, usagePercent } from "./storageUsage";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1,5 KB"],
    [300 * 1024, "300 KB"],
    [4.25 * 1024 * 1024, "4,3 MB"],
    [12.4 * 1024 * 1024, "12 MB"],
    [60 * 1024 ** 3, "60 GB"],
    [2 * 1024 ** 4, "2 TB"],
  ])("formats %d bytes as %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it("treats invalid sizes as zero", () => {
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(undefined)).toBe("0 B");
  });
});

describe("usagePercent", () => {
  it("is the rounded share of the quota in use", () => {
    expect(usagePercent(25, 100)).toBe(25);
    expect(usagePercent(1, 3)).toBe(33);
  });

  it("is null without a usable quota", () => {
    expect(usagePercent(10, 0)).toBeNull();
    expect(usagePercent(10, undefined)).toBeNull();
  });
});

describe("isNearQuota", () => {
  it("is true above 80% of the quota", () => {
    expect(isNearQuota(81, 100)).toBe(true);
    expect(isNearQuota(80, 100)).toBe(false);
    expect(isNearQuota(10, 100)).toBe(false);
  });

  it("is false without a usable quota", () => {
    expect(isNearQuota(10, 0)).toBe(false);
    expect(isNearQuota(undefined, undefined)).toBe(false);
  });
});
