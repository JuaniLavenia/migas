function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Feedback after importing a backup. `images` ({ imported, skipped }) is
// absent when the backup had no photos to restore.
export function importSummary({ ingredients, recipes, skipped, images }) {
  const omitted = [];
  if (skipped) {
    omitted.push(
      `${plural(skipped, "registro omitido", "registros omitidos")} por datos inválidos`,
    );
  }
  if (images?.skipped) {
    omitted.push(plural(images.skipped, "foto omitida", "fotos omitidas"));
  }
  const suffix = omitted.map((part) => ` · ${part}`).join("");
  if (!ingredients.length && !recipes.length) {
    return `No encontramos registros válidos${suffix}`;
  }
  const photos = images?.imported
    ? ` con ${plural(images.imported, "foto", "fotos")}`
    : "";
  return `Importamos ${ingredients.length} insumos y ${recipes.length} recetas${photos}${suffix}`;
}
