// Pure helpers to sort, paginate and read listing state from the URL.

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

function isMissing(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

// Returns a new array sorted by `getValue`. Stable (Array#sort is stable), text
// uses Spanish collation (case/accent-insensitive, digits compared as numbers)
// and missing values (null, undefined, NaN) always go last, whatever the
// direction.
export function sortBy(items, getValue, direction = "asc") {
  const sign = direction === "desc" ? -1 : 1;
  return items
    .map((item) => ({ item, value: getValue(item) }))
    .sort((left, right) => {
      const leftMissing = isMissing(left.value);
      const rightMissing = isMissing(right.value);
      if (leftMissing || rightMissing) return leftMissing - rightMissing;
      return sign * compareValues(left.value, right.value);
    })
    .map(({ item }) => item);
}

// sortBy, or `items` as they are when there is no value reader (custom
// order).
export function sortListing(items, getValue, direction) {
  return getValue ? sortBy(items, getValue, direction) : items;
}

// One page of `items`. The page is clamped to [1, pageCount] and there is
// always at least one (possibly empty) page.
export function paginate(items, page, pageSize) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
  const current = Math.min(Math.max(requested, 1), pageCount);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    total,
  };
}

// Returns a new array with the item at `fromIndex` moved to `toIndex` (clamped
// to the list bounds). An out-of-range source or a move onto the same index
// returns `items` itself, so callers can skip the update.
export function moveItem(items, fromIndex, toIndex) {
  if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= items.length) {
    return items;
  }
  const target = Math.min(Math.max(Math.trunc(toIndex), 0), items.length - 1);
  if (target === fromIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(target, 0, moved);
  return next;
}

// The user's own order: the stored array order, with no direction.
export const CUSTOM_SORT = "personalizado";

export const SORT_PARAM = "orden";
export const DIRECTION_PARAM = "dir";
export const PAGE_PARAM = "pagina";

const directions = ["asc", "desc"];

// Reads `orden`, `dir` and `pagina` from URLSearchParams. Each invalid or
// missing value falls back to its default independently.
export function parseListingParams(
  searchParams,
  { sortKeys, defaultSort, defaultDirection },
) {
  const sort = searchParams.get(SORT_PARAM);
  const direction = searchParams.get(DIRECTION_PARAM);
  const page = searchParams.get(PAGE_PARAM);
  return {
    sort: sortKeys.includes(sort) ? sort : defaultSort,
    direction: directions.includes(direction) ? direction : defaultDirection,
    page: /^[1-9]\d*$/.test(page ?? "") ? Number(page) : 1,
  };
}
