import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./test/renderApp";

// Every form control is reachable by its label, and icon-only buttons have an
// accessible name, so screen readers announce what each one is for.

describe("Form accessibility", () => {
  it("labels every control of the recipe editor", () => {
    renderApp({ route: "/recetas/cookies" });
    const editor = screen.getByRole("textbox", { name: "Nombre de la receta" });
    expect(editor).toHaveValue("Cookies de chocolate");
    expect(screen.getByLabelText("Rendimiento")).toHaveValue(18);
    expect(screen.getByLabelText("Margen de ganancia")).toHaveValue(65);
    expect(screen.getByLabelText("Gastos extra")).toHaveValue(180);

    const ingredientSelects = screen.getAllByRole("combobox", {
      name: "Insumo",
    });
    expect(ingredientSelects).toHaveLength(5);
    expect(ingredientSelects[0]).toHaveValue("harina");
    const quantities = screen.getAllByRole("spinbutton", { name: "Cantidad" });
    expect(quantities).toHaveLength(5);
    expect(quantities[0]).toHaveValue(280);
    expect(
      screen.getAllByRole("button", { name: "Quitar insumo" }),
    ).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Eliminar receta" }),
    ).toBeInTheDocument();
  });

  it("labels every control of the new recipe modal", async () => {
    const { user } = renderApp();
    await user.click(screen.getAllByRole("button", { name: /Nueva receta/ })[0]);
    const form = screen.getByRole("button", { name: "Crear receta" }).closest(
      "form",
    );
    const modal = within(form);

    expect(
      modal.getByRole("textbox", { name: "Nombre de la receta" }),
    ).toBeInTheDocument();
    expect(modal.getByLabelText("Rinde")).toHaveValue(12);
    expect(modal.getByLabelText("Margen")).toHaveValue(60);
    expect(modal.getByLabelText("Gastos extra")).toHaveValue(0);
    expect(modal.getAllByRole("combobox", { name: "Insumo" })).toHaveLength(3);
    expect(modal.getAllByRole("spinbutton", { name: "Cantidad" })).toHaveLength(
      3,
    );
    expect(
      modal.getAllByRole("button", { name: "Quitar insumo" }),
    ).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("labels every control of the ingredient modal", async () => {
    const { user } = renderApp({ route: "/insumos" });
    await user.click(screen.getByRole("button", { name: /Nuevo insumo/ }));

    expect(
      screen.getByRole("textbox", { name: "Nombre del insumo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue(
      "Secos",
    );
    expect(screen.getByRole("combobox", { name: "Unidad base" })).toHaveValue(
      "g",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Contenido del pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Costo del pack" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("labels the ingredient search and the row actions", () => {
    renderApp({ route: "/insumos" });
    expect(
      screen.getByRole("textbox", { name: "Buscar insumo o categoría" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Editar" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Eliminar" }).length,
    ).toBeGreaterThan(0);
  });

  it("names the icon-only buttons of the app shell", () => {
    renderApp();
    expect(
      screen.getByRole("button", { name: "Abrir menú" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar menú" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mi perfil" })).toBeInTheDocument();
  });
});
