import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import {
  currentPath,
  currentSearchParams,
  renderApp,
} from "../../test/renderApp";

// "Insumo 1".."Insumo <count>" with unit price n (pack of 100 g at n * 100),
// plus one last ingredient with an invalid pack size (no unit price).
function seedIngredients(count) {
  const ingredients = Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `insumo-${n}`,
      name: `Insumo ${n}`,
      category: n % 2 ? "Secos" : "Frescos",
      unit: "g",
      packSize: 100,
      packCost: n * 100,
    };
  });
  ingredients.push({
    id: `insumo-${count + 1}`,
    name: `Insumo ${count + 1}`,
    category: "Secos",
    unit: "g",
    packSize: 0,
    packCost: 500,
  });
  return { ingredients, recipes: [] };
}

function visibleNames() {
  return screen
    .getAllByText(/^Insumo \d+$/)
    .map((element) => element.textContent);
}

function pagination() {
  return screen.getByRole("navigation", { name: "Paginación" });
}

describe("Ingredients sorting and pagination", () => {
  it("lists in the custom (stored) order by default, ten per page", () => {
    const state = seedIngredients(25);
    state.ingredients.reverse();
    renderApp({ route: "/insumos", state });
    expect(visibleNames().slice(0, 3)).toEqual([
      "Insumo 26",
      "Insumo 25",
      "Insumo 24",
    ]);
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("personalizado");
    // The custom order has no direction.
    expect(
      screen.queryByRole("button", { name: /^Orden (a|de)scendente$/ }),
    ).not.toBeInTheDocument();
    expect(currentSearchParams().has("orden")).toBe(false);
  });

  it("keeps the default sort out of the URL", async () => {
    const { user } = renderApp({
      route: "/insumos?dir=desc",
      state: seedIngredients(25),
    });
    // The direction in the URL does not apply to the custom order.
    expect(visibleNames()[0]).toBe("Insumo 1");
    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Nombre");
    expect(currentSearchParams().get("orden")).toBe("nombre");
    expect(visibleNames()[0]).toBe("Insumo 26");
    await user.selectOptions(
      screen.getByLabelText("Ordenar por"),
      "Personalizado",
    );
    expect(currentSearchParams().has("orden")).toBe(false);
    expect(visibleNames()[0]).toBe("Insumo 1");
  });

  it("lists ten per page with the total count", () => {
    renderApp({ route: "/insumos", state: seedIngredients(25) });
    expect(visibleNames()).toEqual([
      "Insumo 1",
      "Insumo 2",
      "Insumo 3",
      "Insumo 4",
      "Insumo 5",
      "Insumo 6",
      "Insumo 7",
      "Insumo 8",
      "Insumo 9",
      "Insumo 10",
    ]);
    expect(screen.getByText("26 insumos")).toBeInTheDocument();
    expect(pagination()).toHaveTextContent("Página 1 de 3");
  });

  it("hides the pagination when everything fits on one page", () => {
    renderApp({ route: "/insumos" });
    expect(
      screen.queryByRole("navigation", { name: "Paginación" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("5 insumos")).toBeInTheDocument();
  });

  it("sorts by any field in both directions, unknown prices last", async () => {
    const { user } = renderApp({
      route: "/insumos",
      state: seedIngredients(25),
    });
    await user.selectOptions(
      screen.getByLabelText("Ordenar por"),
      "Costo por unidad",
    );
    expect(currentSearchParams().get("orden")).toBe("costoUnidad");
    expect(visibleNames()[0]).toBe("Insumo 1");

    await user.click(screen.getByRole("button", { name: "Orden ascendente" }));
    expect(currentSearchParams().get("dir")).toBe("desc");
    expect(
      screen.getByRole("button", { name: "Orden descendente" }),
    ).toBeInTheDocument();
    expect(visibleNames().slice(0, 3)).toEqual([
      "Insumo 25",
      "Insumo 24",
      "Insumo 23",
    ]);

    // The ingredient without unit price stays last in both directions.
    await user.click(within(pagination()).getByRole("button", { name: "Página 3" }));
    expect(visibleNames().at(-1)).toBe("Insumo 26");
  });

  it("moves between pages with previous/next and page buttons", async () => {
    const { user } = renderApp({
      route: "/insumos",
      state: seedIngredients(25),
    });
    const nav = pagination();
    expect(within(nav).getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(
      within(nav).getByRole("button", { name: "Página 1" }),
    ).toHaveAttribute("aria-current", "page");

    await user.click(within(nav).getByRole("button", { name: "Siguiente" }));
    expect(pagination()).toHaveTextContent("Página 2 de 3");
    expect(visibleNames()[0]).toBe("Insumo 11");
    expect(currentSearchParams().get("pagina")).toBe("2");

    await user.click(within(pagination()).getByRole("button", { name: "Página 3" }));
    expect(visibleNames()).toEqual([
      "Insumo 21",
      "Insumo 22",
      "Insumo 23",
      "Insumo 24",
      "Insumo 25",
      "Insumo 26",
    ]);
    expect(
      within(pagination()).getByRole("button", { name: "Siguiente" }),
    ).toBeDisabled();

    await user.click(within(pagination()).getByRole("button", { name: "Anterior" }));
    expect(visibleNames()[0]).toBe("Insumo 11");
  });

  it("restores sort, direction and page from the URL", () => {
    renderApp({
      route: "/insumos?orden=costoUnidad&dir=desc&pagina=2",
      state: seedIngredients(25),
    });
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("costoUnidad");
    expect(
      screen.getByRole("button", { name: "Orden descendente" }),
    ).toBeInTheDocument();
    expect(pagination()).toHaveTextContent("Página 2 de 3");
    expect(visibleNames()[0]).toBe("Insumo 15");
  });

  it("falls back to the defaults for invalid query values", () => {
    renderApp({
      route: "/insumos?orden=precio&dir=arriba&pagina=dos",
      state: seedIngredients(25),
    });
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("personalizado");
    expect(pagination()).toHaveTextContent("Página 1 de 3");
    expect(visibleNames()[0]).toBe("Insumo 1");
  });

  it("corrects a page beyond the last one", () => {
    renderApp({ route: "/insumos?pagina=9", state: seedIngredients(25) });
    expect(pagination()).toHaveTextContent("Página 3 de 3");
    expect(currentSearchParams().get("pagina")).toBe("3");
  });

  it("goes back to page 1 when searching or changing the sort", async () => {
    const { user } = renderApp({
      route: "/insumos?pagina=2",
      state: seedIngredients(25),
    });
    await user.type(
      screen.getByPlaceholderText("Buscar insumo o categoría..."),
      "Insumo 2",
    );
    // Insumo 2 and 20..26.
    expect(visibleNames()).toHaveLength(8);
    expect(screen.getByText("8 de 26 insumos")).toBeInTheDocument();
    expect(currentSearchParams().has("pagina")).toBe(false);
    expect(currentPath()).toBe("/insumos");

    await user.clear(
      screen.getByPlaceholderText("Buscar insumo o categoría..."),
    );
    await user.click(within(pagination()).getByRole("button", { name: "Siguiente" }));
    expect(currentSearchParams().get("pagina")).toBe("2");
    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Categoría");
    expect(currentSearchParams().has("pagina")).toBe(false);
    expect(pagination()).toHaveTextContent("Página 1 de 3");
  });

  it("moves to the new last page after deleting its only item", async () => {
    const { user } = renderApp({
      route: "/insumos?pagina=3",
      state: seedIngredients(20),
    });
    expect(visibleNames()).toEqual(["Insumo 21"]);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(visibleNames()[0]).toBe("Insumo 11");
    expect(pagination()).toHaveTextContent("Página 2 de 2");
    expect(currentSearchParams().get("pagina")).toBe("2");
  });
});
