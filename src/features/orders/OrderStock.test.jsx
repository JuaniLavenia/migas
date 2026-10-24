import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

// A batch of 21 cookies takes 1000 g of flour and 200 g of butter.
const harina = { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1000, stock: 2500 };
const manteca = { id: "manteca", name: "Manteca", category: "Lácteos", unit: "g", packSize: 200, packCost: 2000, stock: 100 };
const cookies = {
  id: "cookies",
  name: "Cookies",
  yield: 21,
  margin: 100,
  extras: 0,
  updatedAt: 1,
  items: [
    { ingredientId: "harina", quantity: 1000 },
    { ingredientId: "manteca", quantity: 200 },
  ],
};
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 1 };
const pedido = {
  id: "o",
  client: "Sofi",
  contact: "",
  dueDate: "2026-10-23",
  dueTime: "",
  delivery: "pickup",
  notes: "",
  items: [{ recipeId: "cookies", quantity: 16 }],
  packagingItems: [{ packagingId: "box", quantity: 2 }],
  price: 5000,
  paid: 0,
  status: "confirmed",
  createdAt: 1,
};

function renderOrders(state = {}) {
  return renderApp({
    route: "/pedidos",
    state: {
      ingredients: [harina, manteca],
      recipes: [cookies],
      packaging: [box],
      finishedGoods: [],
      orders: [pedido],
      ...state,
    },
  });
}

const statusSelect = () => screen.getByLabelText("Estado del pedido de Sofi");
const stockOf = (collection, id) =>
  useRecipeStore.getState()[collection].find((item) => item.id === id).stock;
const toast = () => screen.getByRole("status", { name: "Notificaciones" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 23, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Order stock", { timeout: 15000 }, () => {
  it("says what is missing and does not change the status", async () => {
    const { user } = renderOrders();
    await user.selectOptions(statusSelect(), "En preparación");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("No alcanza el stock");
    expect(dialog).toHaveTextContent("Faltan 100 g de Manteca y 1 Box x8");
    expect(useRecipeStore.getState().orders[0].status).toBe("confirmed");
    expect(statusSelect()).toHaveDisplayValue("Confirmado");
    expect(stockOf("ingredients", "harina")).toBe(2500);
  });

  it("lets her update the stock right there and try again", async () => {
    const { user } = renderOrders();
    await user.selectOptions(statusSelect(), "En preparación");
    const form = within(screen.getByRole("dialog"));
    expect(form.getByLabelText("Tengo de Manteca")).toHaveValue(100);
    expect(form.getByText("Necesitás 200 g")).toBeInTheDocument();
    await user.clear(form.getByLabelText("Tengo de Manteca"));
    await user.type(form.getByLabelText("Tengo de Manteca"), "1000");
    await user.clear(form.getByLabelText("Tengo de Box x8"));
    await user.type(form.getByLabelText("Tengo de Box x8"), "10");
    await user.click(form.getByRole("button", { name: "Actualizar y reintentar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useRecipeStore.getState().orders[0].status).toBe("preparing");
    expect(stockOf("ingredients", "harina")).toBe(1500);
    expect(stockOf("ingredients", "manteca")).toBe(800);
    expect(stockOf("packaging", "box")).toBe(8);
    expect(useRecipeStore.getState().finishedGoods).toEqual([
      expect.objectContaining({ recipeId: "cookies", quantity: 5, madeAt: "2026-10-23" }),
    ]);
    expect(toast()).toHaveTextContent("Descontamos el stock del pedido");
  });

  it("keeps asking while the stock is still not enough", async () => {
    const { user } = renderOrders();
    await user.selectOptions(statusSelect(), "En preparación");
    const form = within(screen.getByRole("dialog"));
    await user.clear(form.getByLabelText("Tengo de Manteca"));
    await user.type(form.getByLabelText("Tengo de Manteca"), "1000");
    await user.click(form.getByRole("button", { name: "Actualizar y reintentar" }));
    // The butter was saved; the box is still missing.
    expect(stockOf("ingredients", "manteca")).toBe(1000);
    expect(screen.getByRole("dialog")).toHaveTextContent("Faltan 1 Box x8");
    expect(useRecipeStore.getState().orders[0].status).toBe("confirmed");
  });

  it("returns the stock when the order goes back", async () => {
    const { user } = renderOrders({
      ingredients: [harina, { ...manteca, stock: 1000 }],
      packaging: [{ ...box, stock: 5 }],
    });
    await user.selectOptions(statusSelect(), "En preparación");
    expect(stockOf("ingredients", "manteca")).toBe(800);
    await user.selectOptions(statusSelect(), "Confirmado");
    expect(stockOf("ingredients", "manteca")).toBe(1000);
    expect(stockOf("packaging", "box")).toBe(5);
    expect(useRecipeStore.getState().finishedGoods).toEqual([]);
    expect(toast()).toHaveTextContent("Devolvimos el stock del pedido");
  });

  it("keeps what was cooked as finished goods when it is cancelled", async () => {
    const { user } = renderOrders({
      ingredients: [harina, { ...manteca, stock: 1000 }],
      packaging: [{ ...box, stock: 5 }],
    });
    await user.selectOptions(statusSelect(), "En preparación");
    await user.selectOptions(statusSelect(), "Cancelado");
    expect(stockOf("ingredients", "manteca")).toBe(800);
    expect(stockOf("packaging", "box")).toBe(5);
    expect(
      useRecipeStore
        .getState()
        .finishedGoods.reduce((total, lot) => total + lot.quantity, 0),
    ).toBe(21);
    expect(toast()).toHaveTextContent("Lo cocinado quedó en Elaborados");
  });

  it("checks the stock when the status changes from the order form", async () => {
    const { user } = renderOrders();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const form = within(screen.getByRole("dialog"));
    await user.clear(form.getByLabelText("Notas"));
    await user.type(form.getByLabelText("Notas"), "Sin TACC");
    await user.selectOptions(form.getByLabelText("Estado"), "En preparación");
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));
    // The rest of the order is saved; the status waits for the stock.
    expect(useRecipeStore.getState().orders[0]).toMatchObject({
      notes: "Sin TACC",
      status: "confirmed",
    });
    expect(screen.getByRole("dialog")).toHaveAccessibleName("No alcanza el stock");
  });

  it("cannot prepare an order with a deleted recipe", async () => {
    const { user } = renderOrders({
      orders: [{ ...pedido, items: [{ recipeId: "borrada", quantity: 2 }], packagingItems: [] }],
    });
    await user.selectOptions(statusSelect(), "En preparación");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("No se puede preparar");
    expect(dialog).toHaveTextContent(
      "Este pedido tiene productos o packaging que ya no existen. Editalo antes de prepararlo.",
    );
    expect(within(dialog).queryByRole("button", { name: "Actualizar y reintentar" })).toBeNull();
    expect(useRecipeStore.getState().orders[0].status).toBe("confirmed");
  });
});
