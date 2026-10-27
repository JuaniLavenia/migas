import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import {
  currentPath,
  currentSearchParams,
  renderApp,
} from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const BASE_TIME = Date.UTC(2026, 0, 1);

// "Receta 1".."Receta <count>": a higher n is newer and costs more (extras
// n * 100, yield 1). Margin 0 except "Receta 1", which has the highest price.
function seedRecipes(count) {
  const recipes = Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `receta-${n}`,
      name: `Receta ${n}`,
      yield: 1,
      margin: n === 1 ? 10000 : 0,
      extras: n * 100,
      updatedAt: BASE_TIME + n * 1000,
      items: [],
    };
  });
  return { recipes };
}

function library() {
  return screen.getByRole("region", { name: "Biblioteca de recetas" });
}

function libraryNames() {
  return within(library())
    .getAllByText(/^Receta \d+$/)
    .map((element) => element.textContent);
}

describe("Recipes library sorting and pagination", () => {
  // Categories replaced the pages: collapsing them keeps the list short.
  it("lists every recipe in the custom (stored) order by default", () => {
    renderApp({ route: "/recetas/receta-20?dir=asc", state: seedRecipes(20) });
    expect(libraryNames()).toEqual(
      Array.from({ length: 20 }, (_, index) => `Receta ${index + 1}`),
    );
    expect(within(library()).getByLabelText("Ordenar por")).toHaveValue(
      "personalizado",
    );
    // The custom order has no direction.
    expect(
      within(library()).queryByRole("button", {
        name: /^Orden (a|de)scendente$/,
      }),
    ).not.toBeInTheDocument();
    expect(within(library()).getByText("20 recetas")).toBeInTheDocument();
  });

  it("has no pagination, however many recipes there are", () => {
    renderApp({ route: "/recetas/receta-20", state: seedRecipes(20) });
    expect(
      within(library()).queryByRole("navigation", { name: "Paginación" }),
    ).not.toBeInTheDocument();
  });

  it("sorts by last update, newest first", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-20",
      state: seedRecipes(20),
    });
    await user.selectOptions(
      within(library()).getByLabelText("Ordenar por"),
      "Última actualización",
    );
    expect(currentSearchParams().get("orden")).toBe("actualizacion");
    expect(libraryNames().slice(0, 2)).toEqual(["Receta 20", "Receta 19"]);
  });

  it("sorts by name, cost and suggested price", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-20",
      state: seedRecipes(20),
    });
    const sortSelect = within(library()).getByLabelText("Ordenar por");

    await user.selectOptions(sortSelect, "Nombre");
    // Default direction stays descending: Z→A with numeric collation.
    await user.click(
      within(library()).getByRole("button", { name: "Orden descendente" }),
    );
    expect(libraryNames().slice(0, 3)).toEqual([
      "Receta 1",
      "Receta 2",
      "Receta 3",
    ]);
    expect(currentSearchParams().get("orden")).toBe("nombre");
    expect(currentSearchParams().get("dir")).toBe("asc");

    await user.selectOptions(sortSelect, "Costo total");
    expect(libraryNames()[0]).toBe("Receta 1");
    await user.click(
      within(library()).getByRole("button", { name: "Orden ascendente" }),
    );
    expect(libraryNames()[0]).toBe("Receta 20");

    await user.selectOptions(sortSelect, "Precio sugerido");
    expect(libraryNames()[0]).toBe("Receta 1");
  });

  it("keeps the query string when selecting a recipe", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-20?orden=nombre&dir=asc",
      state: seedRecipes(20),
    });
    await user.click(
      within(library()).getByRole("button", { name: /Receta 12\b/ }),
    );
    expect(currentPath()).toBe("/recetas/receta-12");
    expect(currentSearchParams().toString()).toBe("orden=nombre&dir=asc");
    expect(screen.getByDisplayValue("Receta 12")).toBeInTheDocument();
  });

  it("keeps the query string when redirecting to the last recipe", () => {
    renderApp({ route: "/recetas?orden=nombre", state: seedRecipes(20) });
    expect(currentPath()).toBe("/recetas/receta-1");
    expect(currentSearchParams().get("orden")).toBe("nombre");
  });

  it("falls back to the defaults for invalid query values", () => {
    renderApp({
      route: "/recetas/receta-20?orden=fecha&dir=x&pagina=-1",
      state: seedRecipes(20),
    });
    expect(within(library()).getByLabelText("Ordenar por")).toHaveValue(
      "personalizado",
    );
    expect(libraryNames()[0]).toBe("Receta 1");
  });
});

describe("Recipes library custom order", () => {
  const storedIds = () =>
    useRecipeStore.getState().recipes.map((recipe) => recipe.id);

  it("moves a recipe without touching its last update", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-1",
      state: seedRecipes(3),
    });
    expect(
      within(library()).getByRole("button", { name: "Subir Receta 1" }),
    ).toBeDisabled();
    await user.click(
      within(library()).getByRole("button", { name: "Bajar Receta 1" }),
    );
    expect(libraryNames()).toEqual(["Receta 2", "Receta 1", "Receta 3"]);
    expect(storedIds()).toEqual(["receta-2", "receta-1", "receta-3"]);
    expect(useRecipeStore.getState().getRecipe("receta-1").updatedAt).toBe(
      BASE_TIME + 1000,
    );
    // Reordering is not navigation.
    expect(currentPath()).toBe("/recetas/receta-1");
  });

  it("still opens a recipe on click", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-1",
      state: seedRecipes(3),
    });
    await user.click(
      within(library()).getByRole("button", { name: /^R Receta 3/ }),
    );
    expect(currentPath()).toBe("/recetas/receta-3");
    expect(screen.getByDisplayValue("Receta 3")).toBeInTheDocument();
  });

  it("shows the reorder controls only with the custom order", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-1",
      state: seedRecipes(3),
    });
    expect(
      within(library()).getAllByRole("button", { name: /^Reordenar / }),
    ).toHaveLength(3);
    await user.selectOptions(
      within(library()).getByLabelText("Ordenar por"),
      "Nombre",
    );
    expect(
      within(library()).queryByRole("button", {
        name: /^(Subir|Bajar|Reordenar) /,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("Duplicating a recipe", () => {
  it("adds a copy right after it and opens the copy, the original untouched", async () => {
    const { recipes } = seedRecipes(3);
    const original = {
      ...recipes[0],
      categoryId: "tortas",
      salePrice: 30000,
      imageUrl: "https://example.com/torta.jpg",
      items: [{ ingredientId: "harina", quantity: 500 }],
    };
    const { user } = renderApp({
      route: "/recetas/receta-1",
      state: {
        recipes: [original, recipes[1], recipes[2]],
        recipeCategories: [{ id: "tortas", name: "Tortas" }],
      },
    });
    await user.click(screen.getByRole("button", { name: "Duplicar receta" }));

    const stored = useRecipeStore.getState().recipes;
    expect(stored.map((recipe) => recipe.name)).toEqual([
      "Receta 1",
      "Receta 1 (copia)",
      "Receta 2",
      "Receta 3",
    ]);
    expect(stored[0]).toEqual(original);
    const { id, updatedAt, ...copy } = stored[1];
    expect(copy).toEqual({ ...original, id: undefined, updatedAt: undefined, name: "Receta 1 (copia)" });
    expect(id).not.toBe(original.id);
    expect(updatedAt).toBeGreaterThan(original.updatedAt);
    expect(currentPath()).toBe(`/recetas/${id}`);
    expect(screen.getByLabelText("Nombre de la receta")).toHaveValue("Receta 1 (copia)");
    expect(screen.getByRole("status", { name: "Notificaciones" })).toHaveTextContent(
      "Receta duplicada",
    );
  });
});
