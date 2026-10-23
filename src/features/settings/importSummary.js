function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Feedback after importing a backup (the result of sanitizeBackup).
export function importSummary({
  ingredients,
  recipes,
  recipeCategories = [],
  skipped,
}) {
  const suffix = skipped
    ? ` · ${plural(skipped, "registro omitido", "registros omitidos")} por datos inválidos`
    : "";
  if (!ingredients.length && !recipes.length) {
    return recipeCategories.length
      ? `Importamos ${plural(recipeCategories.length, "categoría", "categorías")}${suffix}`
      : `No encontramos registros válidos${suffix}`;
  }
  return `Importamos ${ingredients.length} insumos y ${recipes.length} recetas${suffix}`;
}
