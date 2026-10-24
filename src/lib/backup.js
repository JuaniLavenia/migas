import { normalizePhotoUrl } from "./photoUrl";
import { ORDER_STATUSES } from "./orders";

// Validation for imported backups. Anything persisted by the store is read on
// every reload, so a malformed record would crash the app permanently. Only
// records with a valid shape are kept, rebuilt from known fields.

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Accepts numbers and numeric strings; everything else becomes NaN so callers
// can reject it (Number("") and Number(null) would otherwise be 0).
function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function withId(record, source) {
  if (nonEmptyString(source.id)) return { id: source.id, ...record };
  if (typeof source.id === "number" && Number.isFinite(source.id)) {
    return { id: String(source.id), ...record };
  }
  return record;
}

function sanitizeIngredient(source) {
  if (!isObject(source) || !nonEmptyString(source.name)) return null;
  const packSize = toFiniteNumber(source.packSize);
  const packCost = toFiniteNumber(source.packCost);
  if (!(packSize > 0) || !(packCost >= 0)) return null;
  return withId(
    {
      name: source.name,
      category: typeof source.category === "string" ? source.category : "",
      unit: nonEmptyString(source.unit) ? source.unit : "g",
      packSize,
      packCost,
      ...stockOf(source),
    },
    source,
  );
}

// Optional: a backup without a valid stock (an older one) leaves it out, so
// importing it keeps the stock already loaded.
function stockOf(source) {
  const stock = toFiniteNumber(source.stock);
  return stock >= 0 ? { stock } : {};
}

// Packaging is counted in units, so it has no unit or category.
function sanitizePackaging(source) {
  if (!isObject(source) || !nonEmptyString(source.name)) return null;
  const packSize = toFiniteNumber(source.packSize);
  const packCost = toFiniteNumber(source.packCost);
  if (!(packSize > 0) || !(packCost >= 0)) return null;
  return withId({ name: source.name, packSize, packCost, ...stockOf(source) }, source);
}

function sanitizeItem(source) {
  if (!isObject(source) || !nonEmptyString(source.ingredientId)) return null;
  const quantity = toFiniteNumber(source.quantity);
  if (!(quantity >= 0)) return null;
  return { ingredientId: source.ingredientId, quantity };
}

function numberAtLeast(value, min, fallback) {
  const parsed = toFiniteNumber(value);
  return parsed >= min ? parsed : fallback;
}

function sanitizeRecipe(source, now) {
  if (!isObject(source) || !nonEmptyString(source.name)) return null;
  if (!Array.isArray(source.items)) return null;
  const items = source.items.map(sanitizeItem);
  // One broken line would silently change the recipe's cost, so the whole
  // recipe is skipped instead of importing it partially.
  if (items.some((item) => item === null)) return null;
  // The photo is a link. Photos of old backups (an `imageId` plus the
  // embedded image) were kept in the browser and are not imported.
  const photoUrl = normalizePhotoUrl(source.imageUrl);
  const image = photoUrl ? { imageUrl: photoUrl } : {};
  // Optional: without a category the recipe is "Sin categoría", without a
  // sale price only the suggested price applies.
  const category = nonEmptyString(source.categoryId)
    ? { categoryId: source.categoryId }
    : {};
  const salePrice = numberAtLeast(source.salePrice, 0, null);
  const price = salePrice === null ? {} : { salePrice };
  return withId(
    {
      name: source.name,
      yield: numberAtLeast(source.yield, 1, 1),
      margin: numberAtLeast(source.margin, 0, 0),
      extras: numberAtLeast(source.extras, 0, 0),
      // Old backups carry an `updated` label ("Hoy"), not a date: like any
      // record without a valid timestamp, they take the import time.
      updatedAt:
        Number.isFinite(source.updatedAt) && source.updatedAt > 0
          ? source.updatedAt
          : now,
      items,
      ...image,
      ...category,
      ...price,
    },
    source,
  );
}

// An order line: a recipe or a packaging item and a positive quantity.
function sanitizeLine(source, key) {
  if (!isObject(source) || !nonEmptyString(source[key])) return null;
  const quantity = toFiniteNumber(source.quantity);
  if (!(quantity > 0)) return null;
  return { [key]: source[key], quantity };
}

// null when the list is not an array (missing is empty) or has a broken
// line: like a recipe, an order is never imported partially.
function sanitizeLines(list, key) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return null;
  const lines = list.map((line) => sanitizeLine(line, key));
  return lines.some((line) => line === null) ? null : lines;
}

function textOr(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

// "2026-02-30" parses in JavaScript but is not a day (Postgres rejects it):
// the date must read back the same.
function isCalendarDay(key) {
  const date = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

function sanitizeOrder(source, now) {
  if (!isObject(source) || !nonEmptyString(source.client)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.dueDate ?? "")) return null;
  if (!isCalendarDay(source.dueDate)) return null;
  const price = toFiniteNumber(source.price);
  if (!(price >= 0)) return null;
  const items = sanitizeLines(source.items, "recipeId");
  const packagingItems = sanitizeLines(source.packagingItems, "packagingId");
  if (!items || !packagingItems) return null;
  return withId(
    {
      client: source.client,
      contact: textOr(source.contact),
      dueDate: source.dueDate,
      dueTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(source.dueTime ?? "")
        ? source.dueTime
        : "",
      delivery: source.delivery === "delivery" ? "delivery" : "pickup",
      notes: textOr(source.notes),
      items,
      packagingItems,
      price,
      paid: numberAtLeast(source.paid, 0, 0),
      status: ORDER_STATUSES.some((entry) => entry.value === source.status)
        ? source.status
        : "pending",
      createdAt:
        Number.isFinite(source.createdAt) && source.createdAt > 0
          ? source.createdAt
          : now,
    },
    source,
  );
}

function sanitizeCategory(source) {
  if (!isObject(source) || !nonEmptyString(source.name)) return null;
  return withId({ name: source.name.trim() }, source);
}

function sanitizeList(list, sanitize) {
  const kept = [];
  let skipped = 0;
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const clean = sanitize(entry);
    if (clean) kept.push(clean);
    else skipped += 1;
  });
  return { kept, skipped };
}

// Returns { ingredients, recipes, recipeCategories, packaging, orders,
// skipped }.
// Accepts recipes with `updatedAt` (current) or the legacy `updated` label.
// Throws when the data is not a backup at all (not an object, or without
// ingredients/recipes/packaging/orders arrays).
export function sanitizeBackup(data, now = Date.now()) {
  if (
    !isObject(data) ||
    (!Array.isArray(data.ingredients) &&
      !Array.isArray(data.recipes) &&
      !Array.isArray(data.packaging) &&
      !Array.isArray(data.orders))
  ) {
    throw new Error("invalid backup shape");
  }
  const ingredients = sanitizeList(data.ingredients, sanitizeIngredient);
  const recipes = sanitizeList(data.recipes, (recipe) =>
    sanitizeRecipe(recipe, now),
  );
  const categories = sanitizeList(data.recipeCategories, sanitizeCategory);
  const packaging = sanitizeList(data.packaging, sanitizePackaging);
  const orders = sanitizeList(data.orders, (order) => sanitizeOrder(order, now));
  return {
    ingredients: ingredients.kept,
    recipes: recipes.kept,
    recipeCategories: categories.kept,
    packaging: packaging.kept,
    orders: orders.kept,
    skipped:
      ingredients.skipped +
      recipes.skipped +
      categories.skipped +
      packaging.skipped +
      orders.skipped,
  };
}
