import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { demoRecipes } from "../../stores/demoData";

const PHOTO = "https://res.cloudinary.com/miga/image/upload/v1/cookies.jpg";

function photoField() {
  return screen.getByRole("region", { name: "Foto de la receta" });
}

const cookies = () => useRecipeStore.getState().getRecipe("cookies");

describe("Recipe photo by URL", () => {
  it("saves a pasted link and shows the photo in the editor and the library", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    const input = within(photoField()).getByLabelText("Link de la foto");
    await user.type(input, `  ${PHOTO} {Enter}`);
    expect(cookies().imageUrl).toBe(PHOTO);
    expect(photoField().querySelector("img")).toHaveAttribute("src", PHOTO);
    const library = screen.getByRole("region", { name: "Biblioteca de recetas" });
    const item = [...library.querySelectorAll(".selector-item")].find((entry) =>
      entry.textContent.includes("Cookies de chocolate"),
    );
    expect(item.querySelector("img")).toHaveAttribute("src", PHOTO);
  });

  it("rejects text that is not a web link", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    const input = within(photoField()).getByLabelText("Link de la foto");
    await user.type(input, "javascript:alert(1){Enter}");
    expect(cookies()).not.toHaveProperty("imageUrl");
    expect(
      within(photoField()).getByText("Pegá un link que empiece con https://"),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("removes the photo", async () => {
    const { user } = renderApp({
      route: "/recetas/cookies",
      state: {
        recipes: demoRecipes.map((recipe) =>
          recipe.id === "cookies" ? { ...recipe, imageUrl: PHOTO } : recipe,
        ),
      },
    });
    await user.click(
      within(photoField()).getByRole("button", { name: "Quitar foto" }),
    );
    expect(cookies()).not.toHaveProperty("imageUrl");
    expect(photoField().querySelector("img")).toBeNull();
  });

  it("shows the photo in the overview list", () => {
    renderApp({
      state: {
        recipes: demoRecipes.map((recipe) =>
          recipe.id === "brownie" ? { ...recipe, imageUrl: PHOTO } : recipe,
        ),
      },
    });
    const row = screen.getByRole("link", { name: /Brownie clásico/ });
    expect(row.querySelector('img[alt=""]')).toHaveAttribute("src", PHOTO);
  });
});
