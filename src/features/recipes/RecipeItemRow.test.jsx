import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RecipeItemRow from "./RecipeItemRow";

const ingredients = [
  { id: "harina", name: "Harina", unit: "g", packSize: 1000, packCost: 1000 },
  { id: "huevos", name: "Huevos", unit: "un", packSize: 12, packCost: 2400 },
];

function renderRow(props) {
  const handlers = { onChange: vi.fn(), onRemove: vi.fn() };
  render(
    <RecipeItemRow
      item={{ ingredientId: "harina", quantity: 250 }}
      ingredient={ingredients[0]}
      ingredients={ingredients}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("RecipeItemRow", () => {
  it("edits the ingredient and quantity and removes the line", () => {
    const { onChange, onRemove } = renderRow();
    fireEvent.change(screen.getByRole("combobox", { name: "Insumo" }), {
      target: { value: "huevos" },
    });
    expect(onChange).toHaveBeenLastCalledWith("ingredientId", "huevos");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cantidad" }), {
      target: { value: "300" },
    });
    expect(onChange).toHaveBeenLastCalledWith("quantity", 300);
    fireEvent.click(screen.getByRole("button", { name: "Quitar insumo" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows the unit label and the line cost in the editor", () => {
    const { container } = render(
      <RecipeItemRow
        item={{ ingredientId: "harina", quantity: 250 }}
        ingredient={ingredients[0]}
        ingredients={ingredients}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.firstChild).toHaveClass("used-row");
    expect(screen.getByText("gramos")).toBeInTheDocument();
    expect(container.querySelector(".used-cost").textContent).toMatch(/250/);
  });

  it("shows the raw unit and a placeholder in the modal", () => {
    const { container } = render(
      <RecipeItemRow
        variant="modal"
        item={{ ingredientId: "harina", quantity: 0 }}
        ingredient={ingredients[0]}
        ingredients={ingredients}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.firstChild).toHaveClass("modal-ingredient-row");
    expect(screen.getByText("g")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cantidad")).toBeInTheDocument();
    expect(container.querySelector(".used-cost")).toBeNull();
  });

  it("keeps a deleted ingredient selected as a disabled option", () => {
    renderRow({ item: { ingredientId: "borrado", quantity: 1 }, ingredient: undefined });
    expect(screen.getByRole("combobox", { name: "Insumo" })).toHaveValue(
      "borrado",
    );
    expect(
      screen.getByRole("option", { name: "Insumo eliminado" }),
    ).toBeDisabled();
  });
});
