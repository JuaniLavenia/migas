import { describe, expect, it, vi } from "vitest";
import {
  moveItem,
  pageOfIndex,
  paginate,
  parseListingParams,
  sortBy,
  sortListing,
} from "./listing";

const byName = (item) => item.name;
const byValue = (item) => item.value;

describe("sortBy", () => {
  it("returns a new array and leaves the input untouched", () => {
    const items = [{ name: "b" }, { name: "a" }];
    const sorted = sortBy(items, byName, "asc");
    expect(sorted).not.toBe(items);
    expect(items.map(byName)).toEqual(["b", "a"]);
    expect(sorted.map(byName)).toEqual(["a", "b"]);
  });

  it("compares text with Spanish collation, ignoring case and accents", () => {
    const items = ["manteca", "Azúcar", "chocolate", "azafrán", "Ñandú", "nuez"].map(
      (name) => ({ name }),
    );
    expect(sortBy(items, byName, "asc").map(byName)).toEqual([
      "azafrán",
      "Azúcar",
      "chocolate",
      "manteca",
      "nuez",
      "Ñandú",
    ]);
  });

  it("compares digits inside text numerically", () => {
    const items = ["Harina 10", "Harina 2", "Harina 0000"].map((name) => ({ name }));
    expect(sortBy(items, byName, "asc").map(byName)).toEqual([
      "Harina 0000",
      "Harina 2",
      "Harina 10",
    ]);
  });

  it("compares numbers numerically in both directions", () => {
    const items = [10, 2, 33, 2.5].map((value) => ({ value }));
    expect(sortBy(items, byValue, "asc").map(byValue)).toEqual([2, 2.5, 10, 33]);
    expect(sortBy(items, byValue, "desc").map(byValue)).toEqual([33, 10, 2.5, 2]);
  });

  it("keeps null, undefined and NaN last in both directions", () => {
    const items = [
      { id: "a", value: null },
      { id: "b", value: 5 },
      { id: "c", value: undefined },
      { id: "d", value: 1 },
      { id: "e", value: Number.NaN },
    ];
    expect(sortBy(items, byValue, "asc").map((item) => item.id)).toEqual([
      "d",
      "b",
      "a",
      "c",
      "e",
    ]);
    expect(sortBy(items, byValue, "desc").map((item) => item.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
      "e",
    ]);
  });

  it("is stable: ties keep their original order in both directions", () => {
    const items = [
      { id: 1, value: 2 },
      { id: 2, value: 1 },
      { id: 3, value: 2 },
      { id: 4, value: 1 },
    ];
    expect(sortBy(items, byValue, "asc").map((item) => item.id)).toEqual([
      2, 4, 1, 3,
    ]);
    expect(sortBy(items, byValue, "desc").map((item) => item.id)).toEqual([
      1, 3, 2, 4,
    ]);
  });

  it("defaults to ascending", () => {
    const items = [{ value: 3 }, { value: 1 }];
    expect(sortBy(items, byValue).map(byValue)).toEqual([1, 3]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it("returns the requested page and its info", () => {
    expect(paginate(items, 2, 10)).toEqual({
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      pageCount: 3,
      total: 23,
    });
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23]);
  });

  it("clamps the page into the valid range", () => {
    expect(paginate(items, 9, 10).page).toBe(3);
    expect(paginate(items, 9, 10).items).toEqual([21, 22, 23]);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -4, 10).items[0]).toBe(1);
    expect(paginate(items, Number.NaN, 10).page).toBe(1);
  });

  it("has one empty page when there are no items", () => {
    expect(paginate([], 3, 10)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });
});

describe("parseListingParams", () => {
  const options = {
    sortKeys: ["nombre", "precio"],
    defaultSort: "nombre",
    defaultDirection: "asc",
  };
  const parse = (query) =>
    parseListingParams(new URLSearchParams(query), options);

  it("uses the defaults when nothing is set", () => {
    expect(parse("")).toEqual({ sort: "nombre", direction: "asc", page: 1 });
  });

  it("reads valid values", () => {
    expect(parse("orden=precio&dir=desc&pagina=3")).toEqual({
      sort: "precio",
      direction: "desc",
      page: 3,
    });
  });

  it("falls back to the default for each invalid value", () => {
    expect(parse("orden=otro&dir=arriba&pagina=dos")).toEqual({
      sort: "nombre",
      direction: "asc",
      page: 1,
    });
    expect(parse("pagina=0").page).toBe(1);
    expect(parse("pagina=-2").page).toBe(1);
    expect(parse("pagina=1.5").page).toBe(1);
    expect(parse("pagina=2abc").page).toBe(1);
  });

  it("does not accept inherited object keys as sort keys", () => {
    expect(parse("orden=constructor").sort).toBe("nombre");
  });
});

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"];

  it("moves an item forward and backward, returning a new array", () => {
    const moved = moveItem(items, 0, 2);
    expect(moved).toEqual(["b", "c", "a", "d"]);
    expect(moved).not.toBe(items);
    expect(items).toEqual(["a", "b", "c", "d"]);
    expect(moveItem(items, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("clamps the target index to the list bounds", () => {
    expect(moveItem(items, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(items, 2, -5)).toEqual(["c", "a", "b", "d"]);
  });

  it("returns the same array for the same index or an unknown source", () => {
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, -1, 2)).toBe(items);
    expect(moveItem(items, 4, 0)).toBe(items);
    expect(moveItem(items, 0, -1)).toBe(items);
  });
});

describe("sortListing", () => {
  it("keeps the given order when there is no value reader", () => {
    const items = [{ name: "b" }, { name: "a" }];
    expect(sortListing(items, null, "desc")).toBe(items);
    expect(sortListing(items, byName, "asc").map(byName)).toEqual(["a", "b"]);
  });

  // Value readers can be costly (recipe totals), so they run once per item,
  // not once per comparison.
  it("reads each item's value once", () => {
    const items = ["d", "a", "c", "b", "e"].map((name) => ({ name }));
    const getValue = vi.fn(byName);
    sortListing(items, getValue, "asc");
    expect(getValue).toHaveBeenCalledTimes(items.length);
  });
});

describe("pageOfIndex", () => {
  it("returns the 1-based page of a 0-based index", () => {
    expect(pageOfIndex(0, 10)).toBe(1);
    expect(pageOfIndex(9, 10)).toBe(1);
    expect(pageOfIndex(10, 10)).toBe(2);
    expect(pageOfIndex(-3, 10)).toBe(1);
  });
});
