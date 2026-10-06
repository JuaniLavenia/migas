import { describe, expect, it } from "vitest";
import {
  draftAfterValueChange,
  draftOnBlur,
  formatNumber,
  parseDraft,
} from "./numericDraft";

describe("parseDraft", () => {
  it.each([
    ["12", 12],
    ["0.5", 0.5],
    [" 7 ", 7],
    ["1.", 1],
  ])("parses %j", (draft, expected) => {
    expect(parseDraft(draft)).toBe(expected);
  });

  it.each([[""], ["   "], ["abc"], ["-"], ["Infinity"]])(
    "returns null for %j",
    (draft) => {
      expect(parseDraft(draft)).toBeNull();
    },
  );

  it("rejects values below the minimum", () => {
    expect(parseDraft("0", 1)).toBeNull();
    expect(parseDraft("-5", 0)).toBeNull();
  });

  it("accepts the minimum itself", () => {
    expect(parseDraft("1", 1)).toBe(1);
    expect(parseDraft("0", 0)).toBe(0);
  });
});

describe("formatNumber", () => {
  it("formats finite numbers and blanks anything else", () => {
    expect(formatNumber(18)).toBe("18");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(undefined)).toBe("");
    expect(formatNumber(NaN)).toBe("");
  });
});

describe("draftAfterValueChange", () => {
  it("keeps the draft when it already represents the new value", () => {
    expect(draftAfterValueChange("1.", 1)).toBe("1.");
    expect(draftAfterValueChange("0.50", 0.5)).toBe("0.50");
  });

  it("replaces the draft when the value changed from outside", () => {
    expect(draftAfterValueChange("12", 18)).toBe("18");
  });

  it("replaces an empty or invalid draft with the new value", () => {
    expect(draftAfterValueChange("", 4)).toBe("4");
    expect(draftAfterValueChange("-5", 3)).toBe("3");
  });
});

describe("draftOnBlur", () => {
  it("normalizes a valid draft", () => {
    expect(draftOnBlur("007", 7, 0)).toBe("7");
    expect(draftOnBlur("1.", 1, 0)).toBe("1");
  });

  it("restores the last committed value when the draft is empty", () => {
    expect(draftOnBlur("", 18, 1)).toBe("18");
  });

  it("restores the last committed value when the draft is below the minimum", () => {
    expect(draftOnBlur("0", 18, 1)).toBe("18");
    expect(draftOnBlur("-3", 40, 0)).toBe("40");
  });
});
