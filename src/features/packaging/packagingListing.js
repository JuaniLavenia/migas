import { CUSTOM_SORT } from "../../lib/listing";
import { unitPrice } from "../../lib/recipeMath";

export const PACKAGING_PER_PAGE = 10;

// URL sort keys (`?orden=`), their labels and how to read each value. The
// custom order keeps the stored order and has no direction.
export const packagingSortOptions = [
  { value: CUSTOM_SORT, label: "Personalizado", directional: false },
  { value: "nombre", label: "Nombre", getValue: (item) => item.name },
  {
    value: "precioPack",
    label: "Costo de compra",
    getValue: (item) => Number(item.packCost),
  },
  { value: "tengo", label: "Tengo", getValue: (item) => Number(item.stock ?? 0) },
  {
    value: "costoUnidad",
    label: "Costo por unidad",
    // null (invalid pack size) sorts last.
    getValue: (item) => unitPrice(item),
  },
];

export const packagingListingDefaults = {
  sortKeys: packagingSortOptions.map((option) => option.value),
  defaultSort: CUSTOM_SORT,
  defaultDirection: "asc",
};

// null for the custom order (nothing to sort by).
export function packagingSortValue(sort) {
  return (
    packagingSortOptions.find((option) => option.value === sort).getValue ??
    null
  );
}
