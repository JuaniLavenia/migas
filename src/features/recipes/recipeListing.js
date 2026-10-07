import { CUSTOM_SORT } from "../../lib/listing";
import { recipeTotals } from "../../lib/recipeMath";

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

export function recipeSortValue(sort, ingredients) {
  switch (sort) {
    case CUSTOM_SORT:
      return null;
    case "nombre":
      return (recipe) => recipe.name;
    case "costo":
      return (recipe) => recipeTotals(recipe, ingredients).cost;
    case "precio":
      return (recipe) => recipeTotals(recipe, ingredients).price;
    case "actualizacion":
    default:
      return (recipe) => recipe.updatedAt;
  }
}
