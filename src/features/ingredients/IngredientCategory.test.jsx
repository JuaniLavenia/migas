import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const ingredient = (id, name, category) => ({
  id,
  name,
  category,
  unit: "g",
  packSize: 1000,
  packCost: 1000,
});

function categorySelect() {
  return within(screen.getByRole("dialog")).getByRole("combobox", {
    name: "Categoría",
  });
}

describe("Ingredient category", () => {
  it("offers the fixed categories, Otros by default", async () => {
    const { user } = renderApp({ route: "/insumos" });
    await user.click(screen.getByRole("button", { name: /Nuevo insumo/ }));
    const options = within(categorySelect())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "Secos",
      "Lácteos",
      "Frescos",
      "Chocolates",
      "Decoración",
      "Otros",
    ]);
    expect(categorySelect()).toHaveValue("Otros");

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Nombre del insumo"), "Grana");
    await user.selectOptions(categorySelect(), "Decoración");
    await user.type(
      within(dialog).getByLabelText("Presentación de compra"),
      "100",
    );
    await user.type(
      within(dialog).getByLabelText("Costo de la presentación"),
      "900",
    );
    await user.click(within(dialog).getByRole("button", { name: "Guardar insumo" }));
    const saved = useRecipeStore
      .getState()
      .ingredients.find((item) => item.name === "Grana");
    expect(saved.category).toBe("Decoración");
  });

  it("keeps a category from before the list until it is changed", async () => {
    const { user } = renderApp({
      route: "/insumos",
      state: { ingredients: [ingredient("c", "Cacao", "Repostería")] },
    });
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(categorySelect()).toHaveValue("Repostería");
    expect(
      within(categorySelect()).getByRole("option", { name: "Repostería" }),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Guardar insumo",
      }),
    );
    expect(useRecipeStore.getState().ingredients[0].category).toBe("Repostería");
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
