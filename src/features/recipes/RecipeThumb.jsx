// The recipe photo when it has one, `fallback` otherwise. Decorative: the
// name is always shown next to it.
function RecipeThumb({ recipe, className, fallback }) {
  if (!recipe.imageUrl) return fallback;
  return <img className={className} src={recipe.imageUrl} alt="" />;
}

export default RecipeThumb;
