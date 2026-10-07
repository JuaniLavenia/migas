import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import {
  currentPath,
  currentSearchParams,
  renderApp,
} from "../../test/renderApp";

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

function pagination() {
  return within(library()).getByRole("navigation", { name: "Paginación" });
}

describe("Recipes library sorting and pagination", () => {
  it("lists the newest first, eight per page, with the total count", () => {
    renderApp({ route: "/recetas/receta-20", state: seedRecipes(20) });
    expect(libraryNames()).toEqual([
      "Receta 20",
      "Receta 19",
      "Receta 18",
      "Receta 17",
      "Receta 16",
      "Receta 15",
      "Receta 14",
      "Receta 13",
    ]);
    expect(within(library()).getByLabelText("Ordenar por")).toHaveValue(
      "actualizacion",
    );
    expect(within(library()).getByText("20 recetas")).toBeInTheDocument();
    expect(pagination()).toHaveTextContent("Página 1 de 3");
  });

  it("hides the pagination when every recipe fits on one page", () => {
    renderApp({ route: "/recetas/cookies" });
    expect(
      within(library()).queryByRole("navigation", { name: "Paginación" }),
    ).not.toBeInTheDocument();
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

  it("pages through the library", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-20",
      state: seedRecipes(20),
    });
    await user.click(
      within(pagination()).getByRole("button", { name: "Siguiente" }),
    );
    expect(pagination()).toHaveTextContent("Página 2 de 3");
    expect(libraryNames()[0]).toBe("Receta 12");
    expect(currentPath()).toBe("/recetas/receta-20");
    expect(currentSearchParams().get("pagina")).toBe("2");
    expect(
      within(pagination()).getByRole("button", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps the query string when selecting a recipe", async () => {
    const { user } = renderApp({
      route: "/recetas/receta-20?orden=nombre&dir=asc&pagina=2",
      state: seedRecipes(20),
    });
    expect(libraryNames()[0]).toBe("Receta 9");

    await user.click(
      within(library()).getByRole("button", { name: /Receta 12\b/ }),
    );
    expect(currentPath()).toBe("/recetas/receta-12");
    expect(currentSearchParams().toString()).toBe(
      "orden=nombre&dir=asc&pagina=2",
    );
    expect(screen.getByDisplayValue("Receta 12")).toBeInTheDocument();
    expect(pagination()).toHaveTextContent("Página 2 de 3");
  });

  it("keeps the query string when redirecting to the last recipe", () => {
    renderApp({ route: "/recetas?orden=nombre", state: seedRecipes(20) });
    expect(currentPath()).toBe("/recetas/receta-1");
    expect(currentSearchParams().get("orden")).toBe("nombre");
  });

  it("keeps the open recipe open when it is not on the visible page", () => {
    renderApp({ route: "/recetas/receta-1", state: seedRecipes(20) });
    expect(screen.getByDisplayValue("Receta 1")).toBeInTheDocument();
    expect(libraryNames()).not.toContain("Receta 1");
    expect(pagination()).toHaveTextContent("Página 1 de 3");
  });

  it("falls back to the defaults for invalid query values", () => {
    renderApp({
      route: "/recetas/receta-20?orden=fecha&dir=x&pagina=-1",
      state: seedRecipes(20),
    });
    expect(within(library()).getByLabelText("Ordenar por")).toHaveValue(
      "actualizacion",
    );
    expect(libraryNames()[0]).toBe("Receta 20");
    expect(pagination()).toHaveTextContent("Página 1 de 3");
  });
});
