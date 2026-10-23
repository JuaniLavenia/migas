function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Feedback after importing a backup (the result of sanitizeBackup).
export function importSummary({
  ingredients,
  recipes,
  recipeCategories = [],
  packaging = [],
  skipped,
}) {
  const suffix = skipped
    ? ` · ${plural(skipped, "registro omitido", "registros omitidos")} por datos inválidos`
    : "";
  if (!ingredients.length && !recipes.length) {
    if (packaging.length) return `Importamos ${packaging.length} packaging${suffix}`;
    return recipeCategories.length
      ? `Importamos ${plural(recipeCategories.length, "categoría", "categorías")}${suffix}`
      : `No encontramos registros válidos${suffix}`;
  }
  if (packaging.length) {
    return `Importamos ${ingredients.length} insumos, ${recipes.length} recetas y ${packaging.length} packaging${suffix}`;
  }
  return `Importamos ${ingredients.length} insumos y ${recipes.length} recetas${suffix}`;
}
