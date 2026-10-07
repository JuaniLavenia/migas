import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./test/renderApp";

// Form modals are real dialogs: named by their title, focus moves inside and
// stays there, Escape closes them and focus returns to the opener.

async function openNewIngredient() {
  const result = renderApp({ route: "/insumos" });
  const opener = screen.getByRole("button", { name: /Nuevo insumo/ });
  await result.user.click(opener);
  return { ...result, opener };
}

describe("Form modals", () => {
  it("is a dialog named by its title with focus inside", async () => {
    await openNewIngredient();
    const dialog = screen.getByRole("dialog", { name: "Nuevo insumo" });
    expect(dialog).toContainElement(document.activeElement);
    // The first field gets the focus, ready to type.
    expect(
      screen.getByRole("textbox", { name: "Nombre del insumo" }),
    ).toHaveFocus();
  });

  it("closes with Escape and returns focus to the opener", async () => {
    const { user, opener } = await openNewIngredient();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(opener).not.toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes with the close button", async () => {
    const { user } = await openNewIngredient();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the dialog", async () => {
    const { user } = renderApp();
    await user.click(screen.getAllByRole("button", { name: /Nueva receta/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Nueva receta" });
    for (let step = 0; step < 25; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement);
    }
  });

  it("names the edit dialog after its title", async () => {
    const { user } = renderApp({ route: "/insumos" });
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(
      screen.getByRole("dialog", { name: "Editar insumo" }),
    ).toBeInTheDocument();
  });
});
