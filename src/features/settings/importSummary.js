function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// "a", "a y b", "a, b y c".
function joinParts(parts) {
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`
    : parts[0];
}

// Feedback after importing a backup (the result of sanitizeBackup).
export function importSummary({
  ingredients,
  recipes,
  recipeCategories = [],
  packaging = [],
  orders = [],
  skipped,
}) {
  const suffix = skipped
    ? ` · ${plural(skipped, "registro omitido", "registros omitidos")} por datos inválidos`
    : "";
  const extras = [
    ...(packaging.length ? [`${packaging.length} packaging`] : []),
    ...(orders.length ? [plural(orders.length, "pedido", "pedidos")] : []),
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
