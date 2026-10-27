import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { createMemoryRepository } from "../../lib/data/memoryRepository";
import { RECIPE_STORAGE_KEY } from "../../lib/recipeStorage";
import { demoIngredients, demoRecipes } from "../../stores/demoData";

const empty = { ingredients: [], recipes: [], recipeCategories: [], ingredientCategories: [] };

// What the phone kept before the cloud: 2 recipes (one with a local photo),
// 5 ingredients, 1 category; last change two hours ago.
const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
const deviceData = {
  [RECIPE_STORAGE_KEY]: JSON.stringify({
    state: {
      ingredients: demoIngredients,
      recipeCategories: [{ id: "cookies-cat", name: "Cookies" }],
      recipes: [
        { ...demoRecipes[0], imageId: "img-1", updatedAt: twoHoursAgo },
        { ...demoRecipes[1], updatedAt: twoHoursAgo - 1000 },
      ],
    },
    version: 2,
  }),
};

function signedIn(repository) {
  return {
    user: { id: "u", email: "ana@example.com" },
    businessId: "business-1",
    repository,
    reload: async () => useRecipeStore.setState(await repository.load()),
    signOut: () => {},
  };
}

function panel() {
  return screen.queryByRole("region", { name: "Subir los datos de este dispositivo" });
}

describe("Manual first upload", () => {
  it("summarizes this device's data and uploads it after confirming", async () => {
    const repository = createMemoryRepository();
    const { user } = renderApp({
      route: "/configuracion",
      state: empty,
      session: signedIn(repository),
      localStorage: deviceData,
    });
    expect(panel()).toHaveTextContent(
      "En este dispositivo hay 2 recetas, 5 insumos y 1 categoría. Última modificación: hace 2 horas.",
    );
    expect(panel()).toHaveTextContent(
      "La foto guardada en este dispositivo no se sube: cargala como link.",
    );
    // Nothing is uploaded until she confirms.
    expect(repository.snapshot().recipes).toEqual([]);

    await user.click(within(panel()).getByRole("button", { name: "Subir a la nube" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Subir" }));

    expect(await screen.findByText("Datos subidos a la nube")).toBeInTheDocument();
    const cloud = repository.snapshot();
    expect(cloud.recipes.map((recipe) => recipe.id)).toEqual(["cookies", "brownie"]);
    expect(cloud.recipes[0]).not.toHaveProperty("imageId");
    expect(cloud.ingredients).toHaveLength(5);
    expect(cloud.recipeCategories).toEqual([{ id: "cookies-cat", name: "Cookies" }]);
    // The store now shows the cloud data, so the panel is gone.
    expect(useRecipeStore.getState().recipes).toHaveLength(2);
    expect(panel()).toBeNull();
  });

  it("cancelling uploads nothing", async () => {
    const repository = createMemoryRepository();
    const { user } = renderApp({
      route: "/configuracion",
      state: empty,
      session: signedIn(repository),
      localStorage: deviceData,
    });
    await user.click(within(panel()).getByRole("button", { name: "Subir a la nube" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }),
    );
    expect(repository.snapshot().recipes).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it("is not offered when the cloud already has data", () => {
    renderApp({
      route: "/configuracion",
      session: signedIn(createMemoryRepository()),
      localStorage: deviceData,
    });
    expect(panel()).toBeNull();
  });

  it("is not offered, nor pointed to, when the cloud only has packaging", () => {
    const state = {
      ...empty,
      packaging: [{ id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 0 }],
    };
    const session = signedIn(createMemoryRepository());
    const settings = renderApp({ route: "/configuracion", state, session, localStorage: deviceData });
    expect(panel()).toBeNull();
    settings.unmount();
    renderApp({ state, session, localStorage: deviceData });
    expect(
      screen.queryByRole("link", { name: /Subir los datos de este dispositivo/ }),
    ).toBeNull();
  });

  it("is not offered, nor pointed to, when the cloud only has orders", () => {
    const state = {
      ...empty,
      orders: [{ id: "o", client: "Ana", dueDate: "2026-10-25", items: [], packagingItems: [], price: 0, paid: 0, status: "pending" }],
    };
    const session = signedIn(createMemoryRepository());
    const settings = renderApp({ route: "/configuracion", state, session, localStorage: deviceData });
    expect(panel()).toBeNull();
    settings.unmount();
    renderApp({ state, session, localStorage: deviceData });
    expect(
      screen.queryByRole("link", { name: /Subir los datos de este dispositivo/ }),
    ).toBeNull();
  });

  it("is not offered without data on this device or outside a session", () => {
    renderApp({
      route: "/configuracion",
      state: empty,
      session: signedIn(createMemoryRepository()),
    });
    expect(panel()).toBeNull();
    renderApp({ route: "/configuracion", state: empty, localStorage: deviceData });
    expect(panel()).toBeNull();
  });

  it("never overwrites a cloud that got data meanwhile", async () => {
    // Another device uploaded first; this tab has not reloaded yet.
    const repository = createMemoryRepository({ data: { recipes: [demoRecipes[1]] } });
    const { user } = renderApp({
      route: "/configuracion",
      state: empty,
      session: signedIn(repository),
      localStorage: deviceData,
    });
    await user.click(within(panel()).getByRole("button", { name: "Subir a la nube" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Subir" }),
    );
    expect(
      await screen.findByText("La nube ya tiene datos: no subimos nada para no pisarlos."),
    ).toBeInTheDocument();
    expect(repository.snapshot().recipes.map((recipe) => recipe.id)).toEqual(["brownie"]);
  });
});

describe("Upload hint in the overview", () => {
  it("points to the upload while the cloud is empty and this device has data", () => {
    renderApp({
      state: empty,
      session: signedIn(createMemoryRepository()),
      localStorage: deviceData,
    });
    const hint = screen.getByRole("link", { name: /Subir los datos de este dispositivo/ });
    expect(hint).toHaveAttribute("href", "/configuracion");
  });

  it("does not show once the cloud has data", () => {
    renderApp({ session: signedIn(createMemoryRepository()), localStorage: deviceData });
    expect(
      screen.queryByRole("link", { name: /Subir los datos de este dispositivo/ }),
    ).toBeNull();
  });
});
