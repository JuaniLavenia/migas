import { CUSTOM_SORT } from "../../lib/listing";
import { unitPrice } from "../../lib/recipeMath";

export const INGREDIENTS_PER_PAGE = 10;

// URL sort keys (`?orden=`), their labels and how to read each value. The
// custom order keeps the stored order and has no direction.
export const ingredientSortOptions = [
  { value: CUSTOM_SORT, label: "Personalizado", directional: false },
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
  defaultSort: CUSTOM_SORT,
  defaultDirection: "asc",
};

// null for the custom order (nothing to sort by).
export function ingredientSortValue(sort) {
  return (
    ingredientSortOptions.find((option) => option.value === sort).getValue ??
    null
  );
}
