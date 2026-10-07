import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./test/renderApp";
import useRecipeStore from "./stores/useRecipeStore";

// Characterization tests of the main UI flows. They describe what the user
// sees and does (roles, labels, text), so they keep passing while the app is
// restructured underneath.

function navItem(name) {
  return screen.getByRole("button", { name });
}

function pageTitle(name) {
  return screen.getByRole("heading", { level: 1, name });
}

describe("App", () => {
  it("navigates between views from the sidebar", async () => {
    const { user } = renderApp();
    expect(pageTitle("Un precio justo empieza acá.")).toBeInTheDocument();

    await user.click(navItem(/^Insumos/));
    expect(pageTitle("Tus insumos.")).toBeInTheDocument();

    await user.click(navItem(/^Recetas/));
    expect(pageTitle("Tus recetas.")).toBeInTheDocument();

    await user.click(navItem(/^Configuración/));
    expect(pageTitle("Tu backup.")).toBeInTheDocument();

    await user.click(navItem(/^Resumen/));
    expect(pageTitle("Un precio justo empieza acá.")).toBeInTheDocument();
  });

  it("lets a recipe numeric field be cleared and retyped", async () => {
    const { user } = renderApp();
    await user.click(navItem(/^Recetas/));
    expect(screen.getByText("Rinde 18 unidades")).toBeInTheDocument();

    const yieldInput = screen.getByDisplayValue("18");
    await user.clear(yieldInput);
    expect(yieldInput).toHaveValue(null);
    // An empty draft commits nothing: the recipe keeps its last yield.
    expect(screen.getByText("Rinde 18 unidades")).toBeInTheDocument();

    await user.type(yieldInput, "24");
    expect(yieldInput).toHaveValue(24);
    expect(screen.getByText("Rinde 24 unidades")).toBeInTheDocument();
  });

  it("creates an ingredient", async () => {
    const { user } = renderApp();
    await user.click(navItem(/^Insumos/));
    await user.click(screen.getByRole("button", { name: /Nuevo insumo/ }));

    await user.type(screen.getByPlaceholderText("Ej. Harina 0000"), "Leche");
    await user.type(screen.getByPlaceholderText("1000"), "1000");
    await user.type(screen.getByPlaceholderText("1250"), "900");
    await user.click(screen.getByRole("button", { name: "Guardar insumo" }));

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Insumo guardado")).toBeInTheDocument();
    expect(navItem(/^Insumos 6/)).toBeInTheDocument();
  });

  it("warns before deleting an ingredient used by recipes", async () => {
    const { user } = renderApp();
    await user.click(navItem(/^Insumos/));
    // First row: Harina 0000, used by both demo recipes.
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByRole("heading", { name: "Eliminar insumo" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'Este insumo se usa en 2 recetas: esas líneas van a quedar sin costo hasta que elijas otro insumo. ¿Eliminar "Harina 0000"? Esta acción no se puede deshacer.',
    );

    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Harina 0000")).not.toBeInTheDocument();
    expect(screen.getByText("Insumo eliminado")).toBeInTheDocument();
    expect(useRecipeStore.getState().ingredients).toHaveLength(4);
  });

  it("shows empty states when there are no recipes", async () => {
    const { user } = renderApp({ state: { recipes: [] } });
    expect(
      screen.getByRole("heading", { level: 2, name: "Sin recetas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay recetas.")).toBeInTheDocument();

    await user.click(navItem(/^Recetas/));
    expect(pageTitle("Tus recetas.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay recetas.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Crear receta/ }),
    ).toBeInTheDocument();
  });
});
