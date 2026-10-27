import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";

// A batch of 21 cookies takes 1000 g of flour, 200 g of butter and 100 g of
// chocolate.
const harina = { id: "harina", name: "Harina", categoryId: "secos", unit: "g", packSize: 1000, packCost: 1000, stock: 2500 };
const manteca = { id: "manteca", name: "Manteca", categoryId: "lacteos", unit: "g", packSize: 200, packCost: 2000, stock: 100 };
const chocolate = { id: "chocolate", name: "Chocolate", categoryId: "chocolates", unit: "g", packSize: 100, packCost: 3000, stock: 0 };
const cookies = {
  id: "cookies",
  name: "Cookies",
  yield: 21,
  margin: 100,
  extras: 0,
  updatedAt: 1,
  items: [
    { ingredientId: "chocolate", quantity: 100 },
    { ingredientId: "harina", quantity: 1000 },
    { ingredientId: "manteca", quantity: 200 },
  ],
};
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 3 };
const pedido = (id, status, quantity, fields = {}) => ({
  id,
  client: id,
  contact: "",
  dueDate: "2026-10-25",
  dueTime: "",
  delivery: "pickup",
  notes: "",
  items: [{ recipeId: "cookies", quantity }],
  packagingItems: [{ packagingId: "box", quantity: 2 }],
  price: 0,
  paid: 0,
  status,
  createdAt: 1,
  ...fields,
});

function renderShopping(state = {}, route = "/compras") {
  return renderApp({
    route,
    state: {
      ingredients: [harina, manteca, chocolate],
      recipes: [cookies],
      packaging: [box],
      // "Si esta semana hay 30 cookies pedidas y 5 ya hechas, son 2 tandas."
      finishedGoods: [{ id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
      orders: [
        pedido("Sofi", "pending", 18),
        pedido("Ana", "confirmed", 12),
        pedido("Luz", "preparing", 40, { stockMove: { ingredients: [] } }),
        pedido("Eva", "delivered", 40),
      ],
      ...state,
    },
  });
}

const navItem = (name) =>
  within(screen.getByRole("navigation")).getByRole("link", { name });
const row = (group, name) =>
  within(screen.getByRole("region", { name: group })).getByText(name).closest(".shopping-row");

describe("Shopping list", () => {
  it("has its own view in the sidebar, counting what is missing", async () => {
    const { user } = renderShopping({}, "/");
    // Butter, chocolate and boxes are short.
    await user.click(navItem(/^Compras 3/));
    expect(currentPath()).toBe("/compras");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lista de compras.");
  });

  it("counts the pending and confirmed orders in full batches, minus the finished goods", () => {
    renderShopping();
    expect(screen.getByText("Vas a cocinar 2 tandas de Cookies.")).toBeInTheDocument();
    const harinaRow = row("Secos", "Harina");
    expect(harinaRow).toHaveTextContent("Necesitás2000 g");
    expect(harinaRow).toHaveTextContent("Tenés2500 g");
    expect(harinaRow).toHaveTextContent("Te faltaNada");
    expect(row("Lácteos", "Manteca")).toHaveTextContent("Te falta300 g");
    expect(row("Chocolates", "Chocolate")).toHaveTextContent("Te falta200 g");
    expect(row("Packaging", "Box x8")).toHaveTextContent("Te falta1 un");
  });

  it("groups by aisle in the order of the categories", () => {
    renderShopping();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent),
    ).toEqual(["Secos", "Lácteos", "Chocolates", "Packaging"]);
  });

  it("can show only what is missing", async () => {
    const { user } = renderShopping();
    await user.click(screen.getByRole("checkbox", { name: "Solo lo que falta" }));
    expect(screen.queryByText("Harina")).toBeNull();
    expect(screen.getByText("Manteca")).toBeInTheDocument();
  });

  it("says when there is nothing to cook or everything is there", () => {
    const first = renderShopping({ orders: [] });
    expect(screen.getByText("No hay pedidos pendientes ni confirmados.")).toBeInTheDocument();
    first.unmount();
    renderShopping({
      ingredients: [
        { ...harina, stock: 9000 },
        { ...manteca, stock: 9000 },
        { ...chocolate, stock: 9000 },
      ],
      packaging: [{ ...box, stock: 9 }],
    });
    expect(screen.getByText("Tenés todo lo que necesitás.")).toBeInTheDocument();
  });
});

describe("Shopping list by her ingredient categories", () => {
  it("follows the order and names of her categories", () => {
    renderShopping({
      ingredientCategories: [
        { id: "chocolates", name: "Chocolatería" },
        { id: "secos", name: "Secos" },
        { id: "lacteos", name: "Lácteos" },
      ],
    });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent),
    ).toEqual(["Chocolatería", "Secos", "Lácteos", "Packaging"]);
  });

  it("groups the ingredients without category, or with a deleted one, under Otros", () => {
    renderShopping({
      ingredientCategories: [
        { id: "otros", name: "Otros" },
        { id: "secos", name: "Secos" },
      ],
      ingredients: [
        harina,
        { ...manteca, categoryId: "deleted" },
        { ...chocolate, categoryId: undefined },
      ],
    });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent),
    ).toEqual(["Otros", "Secos", "Packaging"]);
    expect(row("Otros", "Manteca")).toHaveTextContent("Te falta300 g");
    expect(row("Otros", "Chocolate")).toHaveTextContent("Te falta200 g");
  });

  it("puts Otros last when she has no category with that name", () => {
    renderShopping({
      ingredientCategories: [{ id: "secos", name: "Secos" }],
    });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent),
    ).toEqual(["Secos", "Otros", "Packaging"]);
  });
});
