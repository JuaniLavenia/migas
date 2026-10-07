import { recipeTotals } from "../../lib/recipeMath";

export const RECIPES_PER_PAGE = 8;

// URL sort keys (`?orden=`) and their labels. Cost and price need the
// ingredients, so the value readers are built per render.
export const recipeSortOptions = [
  { value: "actualizacion", label: "Última actualización" },
  { value: "nombre", label: "Nombre" },
  { value: "costo", label: "Costo total" },
  { value: "precio", label: "Precio sugerido" },
];

export const recipeListingDefaults = {
  sortKeys: recipeSortOptions.map((option) => option.value),
  defaultSort: "actualizacion",
  defaultDirection: "desc",
};

export function recipeSortValue(sort, ingredients) {
  switch (sort) {
    case "nombre":
      return (recipe) => recipe.name;
    case "costo":
      return (recipe) => recipeTotals(recipe, ingredients).cost;
    case "precio":
      return (recipe) => recipeTotals(recipe, ingredients).price;
    default:
      return (recipe) => recipe.updatedAt;
  }
}
