import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

async function fillNewIngredient(user, { name, stock }) {
  await user.click(screen.getByRole("button", { name: /Nuevo insumo/ }));
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Nombre del insumo"), name);
  await user.type(within(dialog).getByLabelText("Presentación de compra"), "1000");
  await user.type(within(dialog).getByLabelText("Costo de la presentación"), "1250");
  if (stock !== undefined) {
    await user.type(within(dialog).getByLabelText("Tengo"), stock);
  }
  await user.click(within(dialog).getByRole("button", { name: "Guardar insumo" }));
}

const saved = (name) =>
  useRecipeStore.getState().ingredients.find((item) => item.name === name);

describe("Ingredient stock", () => {
  it("saves how much she has, in the ingredient's unit", async () => {
    const { user } = renderApp({ route: "/insumos", state: { ingredients: [] } });
    await fillNewIngredient(user, { name: "Harina", stock: "2500" });
    expect(saved("Harina").stock).toBe(2500);
    const row = screen.getByText("Harina").closest(".table-row");
    expect(within(row).getByText("2500 g")).toBeInTheDocument();
    expect(screen.getByText("Tengo")).toBeInTheDocument();
  });

  it("takes a blank stock as 0", async () => {
    const { user } = renderApp({ route: "/insumos", state: { ingredients: [] } });
    await fillNewIngredient(user, { name: "Azúcar" });
    expect(saved("Azúcar").stock).toBe(0);
  });

  it("never saves a negative stock", async () => {
    const { user } = renderApp({ route: "/insumos", state: { ingredients: [] } });
    await fillNewIngredient(user, { name: "Manteca", stock: "-5" });
    const all = useRecipeStore.getState().ingredients;
    expect(all.every((item) => item.stock >= 0)).toBe(true);
  });

  it("edits the stock of an ingredient loaded before it existed", async () => {
    const { user } = renderApp({
      route: "/insumos",
      state: {
        ingredients: [
          { id: "h", name: "Huevos", category: "Frescos", unit: "un", packSize: 12, packCost: 2400 },
        ],
      },
    });
    const row = screen.getByText("Huevos").closest(".table-row");
    expect(within(row).getByText("0 un")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    const field = within(dialog).getByLabelText("Tengo");
    expect(field).toHaveValue(0);
    await user.clear(field);
    await user.type(field, "30");
    await user.click(within(dialog).getByRole("button", { name: "Guardar insumo" }));
    expect(saved("Huevos")).toMatchObject({ stock: 30, packSize: 12, packCost: 2400 });
  });
});
