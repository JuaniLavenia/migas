import { joinParts } from "../../lib/format";

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Feedback after importing a backup (the result of sanitizeBackup).
export function importSummary({
  ingredients,
  recipes,
  recipeCategories = [],
  packaging = [],
  orders = [],
  finishedGoods = [],
  skipped,
}) {
  const suffix = skipped
    ? ` · ${plural(skipped, "registro omitido", "registros omitidos")} por datos inválidos`
    : "";
  const extras = [
    ...(packaging.length ? [`${packaging.length} packaging`] : []),
    ...(orders.length ? [plural(orders.length, "pedido", "pedidos")] : []),
    ...(finishedGoods.length
      ? [plural(finishedGoods.length, "tanda elaborada", "tandas elaboradas")]
      : []),
  ];
  if (!ingredients.length && !recipes.length) {
    if (extras.length) return `Importamos ${joinParts(extras)}${suffix}`;
    return recipeCategories.length
      ? `Importamos ${plural(recipeCategories.length, "categoría", "categorías")}${suffix}`
      : `No encontramos registros válidos${suffix}`;
  }
  return `Importamos ${joinParts([
    `${ingredients.length} insumos`,
    `${recipes.length} recetas`,
    ...extras,
  ])}${suffix}`;
}
