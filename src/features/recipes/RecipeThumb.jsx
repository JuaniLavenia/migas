import useRecipeImage from "./useRecipeImage";

// The recipe photo when it has one, `fallback` otherwise (also while it
// loads or when it cannot be read). Decorative: the name is always shown next
// to it.
function RecipeThumb({ recipe, className, fallback }) {
  const { url } = useRecipeImage(recipe.imageId);
  if (!url) return fallback;
  return <img className={className} src={url} alt="" />;
}

export default RecipeThumb;
