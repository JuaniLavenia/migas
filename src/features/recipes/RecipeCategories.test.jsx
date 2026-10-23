import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const recipe = (id, name, categoryId) => ({
  id,
  name,
  yield: 1,
  margin: 0,
  extras: 0,
  updatedAt: 1000,
  items: [],
  ...(categoryId ? { categoryId } : {}),
});

// Stored order mixes the categories on purpose.
const state = {
  recipeCategories: [
    { id: "cookies", name: "Cookies" },
    { id: "budines", name: "Budines" },
    { id: "trufas", name: "Trufas" },
  ],
  recipes: [
    recipe("b1", "Budín de limón", "budines"),
    recipe("c1", "Cookies clásicas", "cookies"),
    recipe("x1", "Mini donas"),
    recipe("b2", "Budín de chocolate", "budines"),
    recipe("c2", "Cookies veganas", "cookies"),
  ],
};

function library() {
  return screen.getByRole("region", { name: "Biblioteca de recetas" });
}

function groupToggle(name) {
  return within(library()).getByRole("button", {
    name: new RegExp(`^${name} \\(\\d+\\)$`),
  });
}

function namesIn(name) {
  const body = document.getElementById(
    groupToggle(name).getAttribute("aria-controls"),
  );
  return [...body.querySelectorAll(".selector-item strong")].map(
    (element) => element.textContent,
  );
}

describe("Recipe library grouped by category", () => {
  it("groups recipes in the category order, empty ones hidden, uncategorized last", () => {
    renderApp({ route: "/recetas/b1", state });
    const toggles = within(library())
      .getAllByRole("button", { name: /\(\d+\)$/ })
      .map((button) => button.textContent);
    expect(toggles).toEqual(["Cookies (2)", "Budines (2)", "Sin categoría (1)"]);
    expect(namesIn("Cookies")).toEqual(["Cookies clásicas", "Cookies veganas"]);
    expect(namesIn("Budines")).toEqual(["Budín de limón", "Budín de chocolate"]);
    expect(namesIn("Sin categoría")).toEqual(["Mini donas"]);
  });

  it("shows a plain list without headers while there are no categories", () => {
    renderApp({ route: "/recetas/cookies" });
    expect(
      within(library()).queryByRole("button", { name: /\(\d+\)$/ }),
    ).toBeNull();
    expect(within(library()).queryByLabelText("Categoría")).toBeNull();
  });

  it("collapses and expands a category", async () => {
    const { user } = renderApp({ route: "/recetas/b1", state });
    const toggle = groupToggle("Cookies");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(library()).queryByRole("button", { name: /^C Cookies clásicas/ }),
    ).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(namesIn("Cookies")).toHaveLength(2);
  });

  it("filters the library by category", async () => {
    const { user } = renderApp({ route: "/recetas/b1", state });
    await user.selectOptions(
      within(library()).getByLabelText("Categoría"),
      "Budines",
    );
    expect(
      within(library()).getAllByRole("button", { name: /\(\d+\)$/ }),
    ).toHaveLength(1);
    expect(namesIn("Budines")).toEqual(["Budín de limón", "Budín de chocolate"]);
    await user.selectOptions(
      within(library()).getByLabelText("Categoría"),
      "Sin categoría",
    );
    expect(namesIn("Sin categoría")).toEqual(["Mini donas"]);
    // Filtering is not navigation: the open recipe stays open.
    expect(currentPath()).toBe("/recetas/b1");
  });

  it("sorts inside each category", async () => {
    const { user } = renderApp({ route: "/recetas/b1", state });
    await user.selectOptions(
      within(library()).getByLabelText("Ordenar por"),
      "Nombre",
    );
    await user.click(
      within(library()).getByRole("button", { name: "Orden descendente" }),
    );
    expect(namesIn("Budines")).toEqual(["Budín de chocolate", "Budín de limón"]);
    expect(namesIn("Cookies")).toEqual(["Cookies clásicas", "Cookies veganas"]);
  });

  it("moves recipes in the custom order only inside their category", async () => {
    const { user } = renderApp({ route: "/recetas/b1", state });
    expect(
      within(library()).getByRole("button", { name: "Subir Budín de limón" }),
    ).toBeDisabled();
    expect(
      within(library()).getByRole("button", { name: "Bajar Budín de chocolate" }),
    ).toBeDisabled();
    await user.click(
      within(library()).getByRole("button", { name: "Bajar Budín de limón" }),
    );
    expect(namesIn("Budines")).toEqual(["Budín de chocolate", "Budín de limón"]);
    expect(namesIn("Cookies")).toEqual(["Cookies clásicas", "Cookies veganas"]);
  });
});

describe("Recipe category in the editor", () => {
  it("assigns an existing category and creates a new one", async () => {
    const { user } = renderApp({ route: "/recetas/x1", state });
    const editor = screen.getByLabelText("Nombre de la receta").closest(
      ".recipe-editor",
    );
    const select = within(editor).getByLabelText("Categoría");
    expect(select).toHaveValue("");

    await user.selectOptions(select, "Trufas");
    expect(useRecipeStore.getState().getRecipe("x1").categoryId).toBe("trufas");
    expect(namesIn("Trufas")).toEqual(["Mini donas"]);

    await user.selectOptions(select, "+ Nueva categoría");
    await user.type(within(editor).getByLabelText("Nueva categoría"), "Donas");
    await user.click(within(editor).getByRole("button", { name: "Crear" }));
    const { recipeCategories, getRecipe } = useRecipeStore.getState();
    const donas = recipeCategories.find((category) => category.name === "Donas");
    expect(getRecipe("x1").categoryId).toBe(donas.id);
    expect(select).toHaveValue(donas.id);
    expect(namesIn("Donas")).toEqual(["Mini donas"]);
  });

  it("creates the recipe in the chosen category from the new-recipe modal", async () => {
    const { user } = renderApp({ route: "/recetas/b1", state });
    await user.click(screen.getByRole("button", { name: /Nueva receta/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Nombre de la receta"),
      "Budín marmolado",
    );
    await user.selectOptions(within(dialog).getByLabelText("Categoría"), "Budines");
    await user.click(within(dialog).getByRole("button", { name: /Crear receta/ }));
    const created = useRecipeStore
      .getState()
      .recipes.find((entry) => entry.name === "Budín marmolado");
    expect(created.categoryId).toBe("budines");
  });
});

describe("Recipe categories in settings", () => {
  it("renames and deletes a category after confirming", async () => {
    const { user } = renderApp({ route: "/configuracion", state });
    const panel = screen.getByRole("region", { name: "Categorías de recetas" });
    const name = within(panel).getByLabelText("Nombre de Budines");
    await user.clear(name);
    await user.type(name, "Budines y tortas{Enter}");
    expect(
      useRecipeStore.getState().recipeCategories.find((c) => c.id === "budines")
        .name,
    ).toBe("Budines y tortas");

    await user.click(
      within(panel).getByRole("button", { name: "Eliminar Budines y tortas" }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("2 recetas quedan sin categoría");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    const after = useRecipeStore.getState();
    expect(after.recipeCategories.map((c) => c.id)).toEqual(["cookies", "trufas"]);
    expect(after.getRecipe("b1")).not.toHaveProperty("categoryId");
  });
});
