import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./test/renderApp";

describe("Ingredients empty states", () => {
  it("invites to create the first ingredient when there are none", async () => {
    const { user } = renderApp({
      route: "/insumos",
      state: { ingredients: [] },
    });
    expect(screen.getByText("Todavía no cargaste insumos.")).toBeInTheDocument();
    expect(
      screen.queryByText("No encontramos insumos con ese nombre."),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Cargar el primer insumo" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the no-results message for a search without matches", async () => {
    const { user } = renderApp({ route: "/insumos" });
    await user.type(screen.getByLabelText(/Buscar/), "zzzz");
    expect(
      screen.getByText("No encontramos insumos con ese nombre."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Todavía no cargaste insumos.")).toBeNull();
  });
});

describe("Recipe editor without ingredients", () => {
  it("explains why ingredients cannot be added yet", () => {
    renderApp({ route: "/recetas/cookies", state: { ingredients: [] } });
    const add = screen.getByRole("button", { name: /Agregar insumo/ });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription(
      "Primero cargá insumos en la sección Insumos.",
    );
    expect(
      screen.getByText("Primero cargá insumos en la sección Insumos."),
    ).toBeInTheDocument();
  });
});
