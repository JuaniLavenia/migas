import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const bolsa = {
  id: "bolsa",
  name: "Bolsa individual",
  packSize: 100,
  packCost: 5000,
  stock: 40,
};
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 3 };

const navItem = (name) =>
  within(screen.getByRole("navigation")).getByRole("link", { name });

function rowOf(name) {
  return screen.getByText(name).closest(".table-row");
}

async function fillForm(user, { name, packSize, packCost, stock }) {
  const dialog = screen.getByRole("dialog");
  const type = async (label, value) => {
    const field = within(dialog).getByLabelText(label);
    await user.clear(field);
    if (value !== undefined) await user.type(field, value);
  };
  await type("Nombre del packaging", name);
  await type("Presentación de compra", packSize);
  await type("Costo de la presentación", packCost);
  await type("Tengo", stock);
  await user.click(within(dialog).getByRole("button", { name: "Guardar packaging" }));
}

describe("Packaging", () => {
  it("has its own view in the sidebar, with the count", async () => {
    const { user } = renderApp({ state: { packaging: [bolsa, box] } });
    await user.click(navItem(/^Packaging 2/));
    expect(currentPath()).toBe("/packaging");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu packaging.");
    expect(navItem(/^Packaging/)).toHaveAttribute("aria-current", "page");
  });

  it("invites to load the first one when there is none", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [] } });
    expect(screen.getByText("Todavía no cargaste packaging.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cargar el primer packaging/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Nuevo packaging");
  });

  it("creates one with its cost per unit and what she has", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [] } });
    await user.click(screen.getByRole("button", { name: /Nuevo packaging/ }));
    await fillForm(user, {
      name: "Bolsa individual",
      packSize: "100",
      packCost: "5000",
      stock: "40",
    });
    expect(useRecipeStore.getState().packaging).toEqual([
      expect.objectContaining({
        name: "Bolsa individual",
        packSize: 100,
        packCost: 5000,
        stock: 40,
      }),
    ]);
    const row = rowOf("Bolsa individual");
    expect(within(row).getByText("100 un")).toBeInTheDocument();
    expect(within(row).getByText("40 un")).toBeInTheDocument();
    expect(within(row).getByText(/50\s*\/\s*un/)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Notificaciones" })).toHaveTextContent(
      "Packaging guardado",
    );
  });

  it("takes a blank stock as 0", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [] } });
    await user.click(screen.getByRole("button", { name: /Nuevo packaging/ }));
    await fillForm(user, { name: "Moño", packSize: "50", packCost: "2500" });
    expect(useRecipeStore.getState().packaging[0].stock).toBe(0);
  });

  it("edits one, keeping the rest", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [bolsa, box] } });
    await user.click(within(rowOf("Box x8")).getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Editar packaging");
    expect(within(dialog).getByLabelText("Tengo")).toHaveValue(3);
    await fillForm(user, { name: "Box x8", packSize: "10", packCost: "9000", stock: "12" });
    expect(useRecipeStore.getState().packaging).toEqual([
      bolsa,
      { ...box, stock: 12 },
    ]);
  });

  it("asks before deleting one", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [bolsa, box] } });
    await user.click(within(rowOf("Bolsa individual")).getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent('¿Eliminar "Bolsa individual"?');
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(useRecipeStore.getState().packaging).toHaveLength(2);
    await user.click(within(rowOf("Bolsa individual")).getByRole("button", { name: "Eliminar" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }),
    );
    expect(useRecipeStore.getState().packaging).toEqual([box]);
  });

  it("searches by name and counts the matches", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [bolsa, box] } });
    expect(screen.getByText("2 items")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar packaging"), "box");
    expect(screen.queryByText("Bolsa individual")).not.toBeInTheDocument();
    expect(screen.getByText("Box x8")).toBeInTheDocument();
    expect(screen.getByText("1 de 2 items")).toBeInTheDocument();
  });

  it("sorts by cost per unit and moves in the custom order", async () => {
    const { user } = renderApp({ route: "/packaging", state: { packaging: [box, bolsa] } });
    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Costo por unidad");
    const names = () =>
      screen.getAllByText(/^(Bolsa individual|Box x8)$/).map((node) => node.textContent);
    expect(names()).toEqual(["Bolsa individual", "Box x8"]);
    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Personalizado");
    expect(names()).toEqual(["Box x8", "Bolsa individual"]);
    await user.click(screen.getByRole("button", { name: "Bajar Box x8" }));
    expect(useRecipeStore.getState().packaging.map((item) => item.id)).toEqual([
      "bolsa",
      "box",
    ]);
  });
});
