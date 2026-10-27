import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const ingredient = (id, name, categoryId) => ({
  id,
  name,
  ...(categoryId ? { categoryId } : {}),
  unit: "g",
  packSize: 1000,
  packCost: 1000,
});

const state = {
  ingredientCategories: [
    { id: "secos", name: "Secos" },
    { id: "lacteos", name: "Lácteos" },
  ],
  ingredients: [
    ingredient("harina", "Harina", "secos"),
    ingredient("manteca", "Manteca", "lacteos"),
    ingredient("azucar", "Azúcar", "secos"),
    ingredient("sal", "Sal"),
  ],
  recipes: [],
};

const store = () => useRecipeStore.getState();

function dialog() {
  return screen.getByRole("dialog");
}

function categorySelect() {
  return within(dialog()).getByRole("combobox", { name: "Categoría" });
}

async function fillNewIngredient(user, name) {
  await user.click(screen.getByRole("button", { name: /Nuevo insumo/ }));
  await user.type(within(dialog()).getByLabelText("Nombre del insumo"), name);
  await user.type(within(dialog()).getByLabelText("Presentación de compra"), "100");
  await user.type(within(dialog()).getByLabelText("Costo de la presentación"), "900");
}

function saveIngredient(user) {
  return user.click(within(dialog()).getByRole("button", { name: "Guardar insumo" }));
}

const saved = (name) => store().ingredients.find((item) => item.name === name);

describe("Ingredient category", () => {
  it("offers her categories, without category by default", async () => {
    const { user } = renderApp({ route: "/insumos", state });
    await fillNewIngredient(user, "Grana");
    const options = within(categorySelect())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Sin categoría", "Secos", "Lácteos", "+ Nueva categoría"]);
    expect(categorySelect()).toHaveValue("");
    await user.selectOptions(categorySelect(), "Lácteos");
    await saveIngredient(user);
    expect(saved("Grana").categoryId).toBe("lacteos");
  });

  it("creates a category from the ingredient form, reusing one with the same name", async () => {
    const { user } = renderApp({ route: "/insumos", state });
    await fillNewIngredient(user, "Grana");
    await user.selectOptions(categorySelect(), "+ Nueva categoría");
    await user.type(within(dialog()).getByLabelText("Nueva categoría"), "Decoración");
    await user.click(within(dialog()).getByRole("button", { name: "Crear" }));
    await saveIngredient(user);
    const created = store().ingredientCategories.at(-1);
    expect(created.name).toBe("Decoración");
    expect(saved("Grana").categoryId).toBe(created.id);

    await fillNewIngredient(user, "Queso");
    await user.selectOptions(categorySelect(), "+ Nueva categoría");
    await user.type(within(dialog()).getByLabelText("Nueva categoría"), "lacteos");
    await user.click(within(dialog()).getByRole("button", { name: "Crear" }));
    await saveIngredient(user);
    expect(store().ingredientCategories).toHaveLength(3);
    expect(saved("Queso").categoryId).toBe("lacteos");
  });

  it("can leave an ingredient without category", async () => {
    const { user } = renderApp({ route: "/insumos", state });
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(categorySelect()).toHaveValue("secos");
    await user.selectOptions(categorySelect(), "Sin categoría");
    await saveIngredient(user);
    expect(saved("Harina").categoryId).toBeFalsy();
  });

  it("shows each ingredient's category name in the list", () => {
    renderApp({
      route: "/insumos",
      state: { ...state, ingredients: [...state.ingredients, ingredient("x", "Cacao", "gone")] },
    });
    const rowOf = (name) => screen.getByText(name).closest("span");
    expect(rowOf("Harina")).toHaveTextContent("Secos");
    expect(rowOf("Manteca")).toHaveTextContent("Lácteos");
    expect(rowOf("Sal")).toHaveTextContent("Sin categoría");
    // An unknown category (deleted from another device) reads the same.
    expect(rowOf("Cacao")).toHaveTextContent("Sin categoría");
  });

  it("searches and sorts by the category name", async () => {
    const { user } = renderApp({ route: "/insumos", state });
    await user.type(screen.getByPlaceholderText("Buscar insumo o categoría..."), "lác");
    expect(screen.getByText("Manteca")).toBeInTheDocument();
    expect(screen.queryByText("Harina")).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Buscar insumo o categoría..."));

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Categoría");
    const names = screen
      .getAllByText(/^(Harina|Manteca|Azúcar)$/)
      .map((element) => element.textContent);
    // Lácteos before Secos (by name, not by id); the name breaks ties.
    expect(names).toEqual(["Manteca", "Azúcar", "Harina"]);
  });

  it("calls the purchase pack 'Presentación de compra' in the list", () => {
    renderApp({ route: "/insumos" });
    expect(screen.getByText("Presentación de compra")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Ordenar por")).getByRole("option", {
        name: "Costo de compra",
      }),
    ).toBeInTheDocument();
  });
});

describe("Ingredient categories in settings", () => {
  it("renames and deletes a category after confirming", async () => {
    const { user } = renderApp({ route: "/configuracion", state });
    const panel = screen.getByRole("region", { name: "Categorías de insumos" });
    const name = within(panel).getByLabelText("Nombre de Secos");
    await user.clear(name);
    await user.type(name, "Almacén{Enter}");
    expect(store().ingredientCategories[0]).toEqual({ id: "secos", name: "Almacén" });

    await user.click(within(panel).getByRole("button", { name: "Eliminar Almacén" }));
    const confirm = screen.getByRole("alertdialog");
    expect(confirm).toHaveTextContent("2 insumos quedan sin categoría");
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }));
    expect(store().ingredientCategories).toEqual([{ id: "lacteos", name: "Lácteos" }]);
    expect(saved("Harina")).not.toHaveProperty("categoryId");
    expect(saved("Manteca").categoryId).toBe("lacteos");
  });

  it("keeps the recipe categories panel apart", () => {
    renderApp({ route: "/configuracion", state });
    expect(screen.getByRole("region", { name: "Categorías de recetas" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Categorías de insumos" })).queryByText(
        /receta/,
      ),
    ).not.toBeInTheDocument();
  });

  it("says where to create the first one", () => {
    renderApp({ route: "/configuracion", state: { ...state, ingredientCategories: [] } });
    expect(
      within(screen.getByRole("region", { name: "Categorías de insumos" })).getByText(
        /Creá la primera desde un insumo, en el campo Categoría/,
      ),
    ).toBeInTheDocument();
  });
});
