import { describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "./test/renderApp";
import useRecipeStore from "./stores/useRecipeStore";
import { formatMonthYear } from "./lib/dates";

// Characterization tests of the main UI flows. They describe what the user
// sees and does (roles, labels, text), so they keep passing while the app is
// restructured underneath.

// Sidebar items are links since views got their own URLs.
function navItem(name) {
  return screen.getByRole("link", { name });
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
    expect(currentPath()).toBe("/insumos");
    expect(navItem(/^Insumos/)).toHaveAttribute("aria-current", "page");

    await user.click(navItem(/^Recetas/));
    expect(pageTitle("Tus recetas.")).toBeInTheDocument();
    expect(currentPath()).toBe("/recetas/cookies");

    await user.click(navItem(/^Configuración/));
    expect(pageTitle("Tu backup.")).toBeInTheDocument();
    expect(currentPath()).toBe("/configuracion");

    await user.click(navItem(/^Resumen/));
    expect(pageTitle("Un precio justo empieza acá.")).toBeInTheDocument();
    expect(currentPath()).toBe("/");
  });

  it("opens a recipe from a deep link", () => {
    renderApp({ route: "/recetas/brownie" });
    expect(pageTitle("Tus recetas.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Brownie clásico")).toBeInTheDocument();
  });

  it("falls back to the recipes list for an unknown recipe id", () => {
    renderApp({ route: "/recetas/no-existe" });
    expect(screen.getByDisplayValue("Cookies de chocolate")).toBeInTheDocument();
    expect(currentPath()).toBe("/recetas/cookies");
  });

  it("redirects unknown paths to the overview", () => {
    renderApp({ route: "/cualquier-cosa" });
    expect(pageTitle("Un precio justo empieza acá.")).toBeInTheDocument();
    expect(currentPath()).toBe("/");
  });

  it("opens a recipe from the overview and the recipe selector", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: /Brownie clásico/ }));
    expect(currentPath()).toBe("/recetas/brownie");
    expect(screen.getByDisplayValue("Brownie clásico")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cookies de chocolate/ }));
    expect(currentPath()).toBe("/recetas/cookies");

    // The overview keeps showing the last recipe opened.
    await user.click(navItem(/^Resumen/));
    expect(
      screen.getByRole("heading", { level: 2, name: "Cookies de chocolate" }),
    ).toBeInTheDocument();
  });

  it("navigates to a recipe after creating it", async () => {
    const { user } = renderApp();
    await user.click(screen.getAllByRole("button", { name: /Nueva receta/ })[0]);
    await user.type(screen.getByPlaceholderText("Ej. Budín de limón"), "Tarta");
    await user.click(screen.getByRole("button", { name: "Crear receta" }));

    const created = useRecipeStore
      .getState()
      .recipes.find((recipe) => recipe.name === "Tarta");
    expect(currentPath()).toBe(`/recetas/${created.id}`);
    expect(screen.getByDisplayValue("Tarta")).toBeInTheDocument();
  });

  it("moves to another recipe after deleting the open one", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    await user.click(screen.getByRole("button", { name: "Eliminar receta" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(currentPath()).toBe("/recetas/brownie");
    expect(screen.getByDisplayValue("Brownie clásico")).toBeInTheDocument();
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

  it("tells the user when saving to the browser fails", async () => {
    const { user } = renderApp();
    expect(screen.getByText("Guardado localmente")).toBeInTheDocument();

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
    await user.click(navItem(/^Recetas/));
    await user.type(screen.getByDisplayValue("18"), "0");
    expect(screen.getByText("No se pudo guardar")).toBeInTheDocument();
    expect(screen.queryByText("Guardado localmente")).not.toBeInTheDocument();

    setItem.mockRestore();
    await user.type(screen.getByDisplayValue("65"), "0");
    expect(screen.getByText("Guardado localmente")).toBeInTheDocument();
  });

  it("shows when each recipe was last updated, relative to now", async () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const { user } = renderApp();
    act(() =>
      useRecipeStore.setState(({ recipes }) => ({
        recipes: recipes.map((recipe) => ({
          ...recipe,
          updatedAt: threeDaysAgo,
        })),
      })),
    );
    expect(
      screen.getAllByText(/Actualizada hace 3 días/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(`Mi cocina / ${formatMonthYear(new Date())}`),
    ).toBeInTheDocument();

    await user.click(navItem(/^Recetas/));
    expect(screen.getByText("hace 3 días")).toBeInTheDocument();
    await user.type(screen.getByDisplayValue("18"), "0");
    expect(screen.getByText("ahora")).toBeInTheDocument();
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
