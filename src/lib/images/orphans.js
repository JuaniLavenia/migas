// Removes the images no recipe points to (left behind by an interrupted
// replace, a failed delete or an import that overwrote a recipe). The
// recipes are read through `getRecipes` *after* listing, so an image that
// was attached meanwhile is not taken for an orphan. Failures are ignored:
// the next run tries again. Returns how many images were removed.
export async function removeOrphanImages(store, getRecipes) {
  if (!(await store.isAvailable())) return 0;
  let listed;
  try {
    listed = await store.list();
  } catch {
    return 0;
  }
  const referenced = new Set(
    getRecipes()
      .map((recipe) => recipe?.imageId)
      .filter(Boolean),
  );
  let removed = 0;
  for (const { id } of listed) {
    if (referenced.has(id)) continue;
    try {
      await store.remove(id);
      removed += 1;
    } catch {
      // Left for the next run.
    }
  }
  return removed;
}
