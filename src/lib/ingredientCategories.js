import { v4 as uuidv4 } from "uuid";

// The ingredient categories the app had as a fixed list, before they were
// editable. Data from then (a browser's local data, an old backup) carries
// these names as text; the cloud migration created them in this order too.
export const LEGACY_INGREDIENT_CATEGORIES = [
  "Secos",
  "Lácteos",
  "Frescos",
  "Chocolates",
  "Decoración",
  "Otros",
];

// Category names compare ignoring case and accents.
export function sameName(a, b) {
  return a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
}

// Gives each ingredient that carries a category name (`category`, the old
// format) the id of the category with that name in `categories`, adding a
// category for each new name. Returns { categories, ingredients }; no
// ingredient keeps `category`, and one with a blank name has no category.
export function resolveCategoryNames(ingredients, categories, newId = uuidv4) {
  const resolved = [...categories];
  const next = ingredients.map((ingredient) => {
    if (!("category" in ingredient)) return ingredient;
    const { category, ...rest } = ingredient;
    const name = String(category ?? "").trim();
    if (!name || rest.categoryId) return rest;
    let match = resolved.find((item) => sameName(item.name, name));
    if (!match) {
      match = { id: newId(), name };
      resolved.push(match);
    }
    return { ...rest, categoryId: match.id };
  });
  return { categories: resolved, ingredients: next };
}
