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
    },
    source,
  );
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
    },
    source,
  );
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

// Returns { ingredients, recipes, skipped }. Accepts recipes with `updatedAt`
// (current) or the legacy `updated` label. Throws when the data is not a
// backup at all (not an object, or without ingredients/recipes arrays).
export function sanitizeBackup(data, now = Date.now()) {
  if (
    !isObject(data) ||
    (!Array.isArray(data.ingredients) && !Array.isArray(data.recipes))
  ) {
    throw new Error("invalid backup shape");
  }
  const ingredients = sanitizeList(data.ingredients, sanitizeIngredient);
  const recipes = sanitizeList(data.recipes, (recipe) =>
    sanitizeRecipe(recipe, now),
  );
  return {
    ingredients: ingredients.kept,
    recipes: recipes.kept,
    skipped: ingredients.skipped + recipes.skipped,
  };
}
