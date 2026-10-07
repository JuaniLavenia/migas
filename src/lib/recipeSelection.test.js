import { describe, expect, it } from "vitest";
import { resolveSelectedRecipe } from "./recipeSelection";

const recipes = [
  { id: "cookies", name: "Cookies" },
  { id: "brownie", name: "Brownie" },
];

describe("resolveSelectedRecipe", () => {
  it("returns the recipe matching the selected id", () => {
    expect(resolveSelectedRecipe(recipes, "brownie")).toBe(recipes[1]);
  });

  it("falls back to the first recipe when the id does not exist", () => {
    expect(resolveSelectedRecipe(recipes, "deleted")).toBe(recipes[0]);
  });

  it("falls back to the first recipe when no id is selected", () => {
    expect(resolveSelectedRecipe(recipes, undefined)).toBe(recipes[0]);
  });

  it("returns null when there are no recipes", () => {
    expect(resolveSelectedRecipe([], "cookies")).toBeNull();
  });

  it("returns null when recipes is not an array", () => {
    expect(resolveSelectedRecipe(undefined, "cookies")).toBeNull();
  });
});
