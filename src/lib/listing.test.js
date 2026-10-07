import { describe, expect, it } from "vitest";
import { paginate, parseListingParams, sortBy } from "./listing";

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
