import { unitPrice } from "../../lib/recipeMath";

export const INGREDIENTS_PER_PAGE = 10;

// URL sort keys (`?orden=`), their labels and how to read each value.
export const ingredientSortOptions = [
  { value: "nombre", label: "Nombre", getValue: (item) => item.name },
  { value: "categoria", label: "Categoría", getValue: (item) => item.category },
  {
    value: "precioPack",
    label: "Precio del pack",
    getValue: (item) => Number(item.packCost),
  },
  {
    value: "costoUnidad",
    label: "Costo por unidad",
    // null (invalid pack size) sorts last.
    getValue: (item) => unitPrice(item),
  },
];

export const ingredientListingDefaults = {
  sortKeys: ingredientSortOptions.map((option) => option.value),
  defaultSort: "nombre",
  defaultDirection: "asc",
};

export function ingredientSortValue(sort) {
  return ingredientSortOptions.find((option) => option.value === sort).getValue;
}
