import { CUSTOM_SORT } from "../../lib/listing";
import { indexIngredients, recipeTotals } from "../../lib/recipeMath";

export const RECIPES_PER_PAGE = 8;

// URL sort keys (`?orden=`) and their labels. Cost and price need the
// ingredients, so the value readers are built per render. The custom order
// keeps the stored order and has no direction.
export const recipeSortOptions = [
  { value: CUSTOM_SORT, label: "Personalizado", directional: false },
  { value: "actualizacion", label: "Última actualización" },
  { value: "nombre", label: "Nombre" },
  { value: "costo", label: "Costo total" },
  { value: "precio", label: "Precio sugerido" },
];

export const recipeListingDefaults = {
  sortKeys: recipeSortOptions.map((option) => option.value),
  defaultSort: CUSTOM_SORT,
  // For the other options: newest / most expensive first.
  defaultDirection: "desc",
};

// sortListing reads each recipe's value once (not per comparison), and the
// ingredient index is built once per reader.
export function recipeSortValue(sort, ingredients) {
  switch (sort) {
    case CUSTOM_SORT:
      return null;
    case "nombre":
      return (recipe) => recipe.name;
    case "costo": {
      const byId = indexIngredients(ingredients);
      return (recipe) => recipeTotals(recipe, ingredients, byId).cost;
    }
    case "precio": {
      const byId = indexIngredients(ingredients);
      return (recipe) => recipeTotals(recipe, ingredients, byId).price;
    }
    case "actualizacion":
    default:
      return (recipe) => recipe.updatedAt;
  }
}
