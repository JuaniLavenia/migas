import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

// Cost 8.400 for 21 units (only extras): 400 each; 100% over cost: 800.
const state = {
  recipes: [
    {
      id: "cookies",
      name: "Cookies",
      yield: 21,
      margin: 100,
      extras: 8400,
      updatedAt: 1000,
      items: [],
    },
  ],
};

function costBlock() {
  return screen.getByRole("group", { name: "Lo que te cuesta" });
}

function priceBlock() {
  return screen.getByRole("group", { name: "A cuánto venderlo (por unidad)" });
}

// The value next to a label of the block, with the non-breaking spaces of
// es-AR currency formatting normalized.
function value(block, label) {
  const term = within(block).getByText(label, { selector: "dt" });
  return term.nextElementSibling.textContent.replace(/\s+/g, " ");
}

describe("Recipe pricing card", () => {
  it("separates what it costs from what to sell it for", () => {
    renderApp({ route: "/recetas/cookies", state });
    expect(value(costBlock(), "Toda la tanda (21 u.)")).toBe("$ 8.400");
    expect(value(costBlock(), "Cada unidad")).toBe("$ 400");
    expect(value(priceBlock(), "Sugerido")).toBe("$ 800");
    expect(value(priceBlock(), "Tu precio")).toBe("Sin cargar");
    expect(value(priceBlock(), "Ganás por unidad")).toBe("$ 400");
  });

  it("explains the percentage over cost", () => {
    renderApp({ route: "/recetas/cookies", state });
    expect(
      screen.getByLabelText("Ganancia sobre el costo (%)"),
    ).toHaveAccessibleDescription("100% = vendés al doble de lo que te cuesta");
  });

  it("uses her sale price and warns when it is below the suggested one", async () => {
    const { user } = renderApp({ route: "/recetas/cookies", state });
    await user.type(screen.getByLabelText("Precio de venta"), "750");
    expect(useRecipeStore.getState().getRecipe("cookies").salePrice).toBe(750);
    expect(value(priceBlock(), "Tu precio")).toMatch(/^\$ 750/);
    expect(value(priceBlock(), "Ganás por unidad")).toBe("$ 350");
    expect(
      within(priceBlock()).getByText("6% debajo del sugerido"),
    ).toBeInTheDocument();
  });

  it("clears the sale price back to not set", async () => {
    const { user } = renderApp({
      route: "/recetas/cookies",
      state: { recipes: [{ ...state.recipes[0], salePrice: 900 }] },
    });
    expect(within(priceBlock()).queryByText(/debajo del sugerido/)).toBeNull();
    await user.clear(screen.getByLabelText("Precio de venta"));
    expect(useRecipeStore.getState().getRecipe("cookies")).not.toHaveProperty(
      "salePrice",
    );
    expect(value(priceBlock(), "Tu precio")).toBe("Sin cargar");
  });
});
