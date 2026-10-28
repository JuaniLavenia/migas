import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { currency } from "../../lib/format";

// 21 cookies cost 2100 (100 per unit); suggested at +100%: 200 per unit.
const harina = { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1000, stock: 10000 };
const cookies = {
  id: "cookies",
  name: "Cookies",
  yield: 21,
  margin: 100,
  extras: 0,
  updatedAt: 1,
  items: [{ ingredientId: "harina", quantity: 2100 }],
};
// One torta costs 100 too (suggested 200), but sells at its sale price.
const torta = {
  ...cookies,
  id: "torta",
  name: "Torta",
  yield: 1,
  salePrice: 30000,
  items: [{ ingredientId: "harina", quantity: 100 }],
};
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 5 };
// 100 per gram.
const colorante = { id: "colorante", name: "Colorante naranja", category: "Decoración", unit: "g", packSize: 10, packCost: 1000, stock: 50 };

const pedido = (fields) => ({
  id: fields.id ?? fields.client,
  contact: "",
  dueDate: "2026-10-22",
  dueTime: "",
  delivery: "pickup",
  notes: "",
  items: [{ recipeId: "cookies", quantity: 16 }],
  packagingItems: [],
  price: 4000,
  paid: 0,
  status: "pending",
  createdAt: 1,
  ...fields,
});

const catalog = { ingredients: [harina, colorante], recipes: [cookies, torta], packaging: [box] };

function renderOrders(orders = [], route = "/pedidos") {
  return renderApp({ route, state: { ...catalog, orders } });
}

const navItem = (name) =>
  within(screen.getByRole("navigation")).getByRole("link", { name });
const card = (client) => screen.getByRole("article", { name: `Pedido de ${client}` });
const group = (label) => screen.getByRole("region", { name: label });
// Intl separates "$" with a no-break space; toHaveTextContent reads a plain one.
const money = (value) => currency.format(value).replace(/\s/g, " ");

beforeEach(() => {
  // Thursday 22 October 2026, 10:00: tomorrow is Friday, the week ends Sunday 25.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

// These tests fill whole forms: under a full parallel run they can pass the
// default 5 s.
describe("Orders", { timeout: 15000 }, () => {
  it("has its own view in the sidebar, counting the open orders", async () => {
    const { user } = renderOrders(
      [pedido({ client: "Sofi" }), pedido({ client: "Ana", status: "delivered" })],
      "/",
    );
    await user.click(navItem(/^Pedidos 1/));
    expect(currentPath()).toBe("/pedidos");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tus pedidos.");
  });

  it("invites to load the first one when there is none", async () => {
    const { user } = renderOrders([]);
    expect(screen.getByText("Todavía no cargaste pedidos.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cargar el primer pedido/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Nuevo pedido");
  });

  it("creates an order with products, packaging and the proposed price", async () => {
    const { user } = renderOrders([]);
    await user.click(screen.getByRole("button", { name: /Nuevo pedido/ }));
    const dialog = screen.getByRole("dialog");
    const form = within(dialog);
    expect(form.getByLabelText("Cliente")).toBeRequired();
    expect(form.getByLabelText("Fecha de entrega")).toBeRequired();
    await user.type(form.getByLabelText("Cliente"), "Sofi");
    await user.type(form.getByLabelText("Contacto"), "@sofi.ok");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-10-24");
    await user.type(form.getByLabelText("Hora"), "17:30");
    await user.click(form.getByRole("radio", { name: "Envío" }));

    await user.click(form.getByRole("button", { name: /Agregar producto/ }));
    await user.selectOptions(form.getByLabelText("Producto 1"), "Cookies");
    await user.clear(form.getByLabelText("Unidades de producto 1"));
    await user.type(form.getByLabelText("Unidades de producto 1"), "16");
    await user.click(form.getByRole("button", { name: /Agregar producto/ }));
    await user.selectOptions(form.getByLabelText("Producto 2"), "Torta");
    await user.click(form.getByRole("button", { name: /Agregar packaging/ }));
    await user.selectOptions(form.getByLabelText("Packaging 1"), "Box x8");
    await user.clear(form.getByLabelText("Cantidad de packaging 1"));
    await user.type(form.getByLabelText("Cantidad de packaging 1"), "2");
    await user.type(form.getByLabelText("Notas"), "Que diga Feliz cumple Sofi");
    await user.type(form.getByLabelText("Cobrado"), "10000");

    // 16 × 200 (suggested, no sale price) + 1 × 30000 (sale price) + 2 × 900 (box at cost).
    const proposed = 16 * 200 + 30000 + 1800;
    const cost = 17 * 100 + 1800;
    expect(form.getByLabelText("Precio acordado")).toHaveValue(proposed);
    expect(form.getByText("Precio propuesto").parentElement).toHaveTextContent(money(proposed));
    expect(form.getByText("Sugerido").parentElement).toHaveTextContent(
      money(17 * 200 + 1800),
    );
    expect(form.getByText("Costo").parentElement).toHaveTextContent(money(cost));
    expect(form.getByText("Ganancia real").parentElement).toHaveTextContent(
      money(proposed - cost),
    );
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));

    expect(useRecipeStore.getState().orders).toEqual([
      expect.objectContaining({
        client: "Sofi",
        contact: "@sofi.ok",
        dueDate: "2026-10-24",
        dueTime: "17:30",
        delivery: "delivery",
        notes: "Que diga Feliz cumple Sofi",
        items: [
          { recipeId: "cookies", quantity: 16 },
          { recipeId: "torta", quantity: 1 },
        ],
        packagingItems: [{ packagingId: "box", quantity: 2 }],
        price: proposed,
        paid: 10000,
        status: "pending",
      }),
    ]);
    expect(useRecipeStore.getState().orders[0].customization).toBeUndefined();
    expect(form.queryByText("Personalización", { selector: "span" })).not.toBeInTheDocument();
    const saved = within(within(group("Esta semana")).getByRole("article", { name: "Pedido de Sofi" }));
    expect(saved.getByText(/16 Cookies · 1 Torta · 2 Box x8/)).toBeInTheDocument();
    expect(saved.getByText(/17:30/)).toBeInTheDocument();
    expect(saved.getByText("Envío")).toBeInTheDocument();
    expect(saved.getByText(`Señado · falta ${money(proposed - 10000)}`)).toBeInTheDocument();
    expect(saved.getByLabelText("Estado del pedido de Sofi")).toHaveDisplayValue("Pendiente");
    expect(screen.getByRole("status", { name: "Notificaciones" })).toHaveTextContent(
      "Pedido guardado",
    );
  });

  it("adds a themed customization: decoration at cost and a % design fee over the products", async () => {
    const { user } = renderOrders([]);
    await user.click(screen.getByRole("button", { name: /Nuevo pedido/ }));
    const form = within(screen.getByRole("dialog"));
    await user.type(form.getByLabelText("Cliente"), "Sofi");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-10-24");
    await user.click(form.getByRole("button", { name: /Agregar producto/ }));
    await user.clear(form.getByLabelText("Unidades de producto 1"));
    await user.type(form.getByLabelText("Unidades de producto 1"), "16");

    await user.click(form.getByRole("button", { name: /Agregar insumo de decoración/ }));
    await user.selectOptions(form.getByLabelText("Insumo de decoración 1"), "Colorante naranja");
    const amount = form.getByLabelText("Cantidad de decoración 1");
    expect(amount.parentElement).toHaveTextContent("g");
    await user.clear(amount);
    await user.type(amount, "2.5");
    expect(form.getByLabelText("Tipo de recargo")).toHaveDisplayValue("%");
    await user.type(form.getByLabelText("Recargo por diseño"), "50");

    // Products 16 × 200 = 3200; fee 50% = 1600; decoration 2.5 g × 100 = 250.
    const proposed = 3200 + 1600 + 250;
    expect(form.getByLabelText("Precio acordado")).toHaveValue(proposed);
    expect(form.getByText("Personalización", { selector: "span" }).parentElement).toHaveTextContent(
      money(1850),
    );
    expect(form.getByText("Costo").parentElement).toHaveTextContent(money(1600 + 250));
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));

    expect(useRecipeStore.getState().orders[0]).toMatchObject({
      price: proposed,
      customization: {
        items: [{ ingredientId: "colorante", quantity: 2.5 }],
        feeType: "percent",
        fee: 50,
      },
    });
    expect(within(card("Sofi")).getByText(/16 Cookies · Personalizado/)).toBeInTheDocument();
  });

  it("edits a fixed design fee and removes the customization", async () => {
    const { user } = renderOrders([
      pedido({
        client: "Sofi",
        customization: {
          items: [{ ingredientId: "colorante", quantity: 3 }],
          feeType: "amount",
          fee: 1500,
        },
      }),
    ]);
    await user.click(within(card("Sofi")).getByRole("button", { name: "Editar" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByLabelText("Insumo de decoración 1")).toHaveDisplayValue("Colorante naranja");
    expect(form.getByLabelText("Cantidad de decoración 1")).toHaveValue(3);
    expect(form.getByLabelText("Tipo de recargo")).toHaveDisplayValue("ARS");
    expect(form.getByLabelText("Recargo por diseño")).toHaveValue(1500);
    // 16 × 200 + 1500 + 3 × 100.
    expect(form.getByText("Precio propuesto").parentElement).toHaveTextContent(money(5000));

    await user.click(form.getByRole("button", { name: "Quitar insumo de decoración 1" }));
    await user.clear(form.getByLabelText("Recargo por diseño"));
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));
    expect(useRecipeStore.getState().orders[0].customization).toBeUndefined();
    expect(within(card("Sofi")).queryByText(/Personalizado/)).not.toBeInTheDocument();
  });

  it("does not save an order whose client is only spaces", async () => {
    const { user } = renderOrders([]);
    await user.click(screen.getByRole("button", { name: /Nuevo pedido/ }));
    const form = within(screen.getByRole("dialog"));
    await user.type(form.getByLabelText("Cliente"), "   ");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-10-22");
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));
    expect(useRecipeStore.getState().orders).toEqual([]);
    expect(form.getByLabelText("Cliente")).toHaveAccessibleDescription("Escribí el nombre del cliente.");
  });

  it("keeps an agreed price she edits and shows the real profit with it", async () => {
    const { user } = renderOrders([]);
    await user.click(screen.getByRole("button", { name: /Nuevo pedido/ }));
    const form = within(screen.getByRole("dialog"));
    await user.type(form.getByLabelText("Cliente"), "Ana");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-10-22");
    await user.click(form.getByRole("button", { name: /Agregar producto/ }));
    await user.selectOptions(form.getByLabelText("Producto 1"), "Torta");
    await user.clear(form.getByLabelText("Precio acordado"));
    await user.type(form.getByLabelText("Precio acordado"), "25000");
    expect(form.getByText("Ganancia real").parentElement).toHaveTextContent(money(25000 - 100));
    // Changing the products no longer overwrites her price.
    await user.clear(form.getByLabelText("Unidades de producto 1"));
    await user.type(form.getByLabelText("Unidades de producto 1"), "2");
    expect(form.getByLabelText("Precio acordado")).toHaveValue(25000);
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));
    expect(useRecipeStore.getState().orders[0]).toMatchObject({ price: 25000, paid: 0 });
    expect(within(card("Ana")).getByText("Sin pagar")).toBeInTheDocument();
  });

  it("groups by delivery date and hides delivered and cancelled orders until asked", async () => {
    const { user } = renderOrders([
      pedido({ client: "Atrasada", dueDate: "2026-10-20", status: "ready" }),
      pedido({ client: "Hoy", dueDate: "2026-10-22", dueTime: "09:00" }),
      pedido({ client: "Mañana", dueDate: "2026-10-23" }),
      pedido({ client: "Domingo", dueDate: "2026-10-25" }),
      pedido({ client: "Lunes", dueDate: "2026-10-26" }),
      pedido({ client: "Entregada", dueDate: "2026-10-19", status: "delivered" }),
      pedido({ client: "Cancelada", dueDate: "2026-10-23", status: "cancelled" }),
    ]);
    const headings = () =>
      screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings()).toEqual([
      "Atrasados 1",
      "Hoy 1",
      "Mañana 1",
      "Esta semana 1",
      "Más adelante 1",
    ]);
    expect(within(group("Atrasados")).getByText("Atrasada")).toBeInTheDocument();
    expect(screen.queryByText("Entregada")).toBeNull();
    expect(screen.queryByText("Cancelada")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Mostrar"), "Todos");
    expect(headings()).toEqual([
      "Atrasados 1",
      "Hoy 1",
      "Mañana 2",
      "Esta semana 1",
      "Más adelante 1",
      "Anteriores 1",
    ]);
    expect(within(group("Anteriores")).getByText("Entregada")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Mostrar"), "Cancelado");
    expect(headings()).toEqual(["Mañana 1"]);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("changes the status from the list, without opening the order", async () => {
    const { user } = renderOrders([pedido({ client: "Sofi" })]);
    await user.selectOptions(screen.getByLabelText("Estado del pedido de Sofi"), "En preparación");
    expect(useRecipeStore.getState().orders[0].status).toBe("preparing");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Estado del pedido de Sofi"), "Entregado");
    expect(useRecipeStore.getState().orders[0].status).toBe("delivered");
    // Delivered: out of the open orders.
    expect(screen.queryByText("Sofi")).toBeNull();
    expect(screen.getByText("No hay pedidos con ese filtro.")).toBeInTheDocument();
  });

  it("searches by client", async () => {
    const { user } = renderOrders([pedido({ client: "Sofi" }), pedido({ client: "Ana" })]);
    await user.type(screen.getByLabelText("Buscar por cliente"), "sof");
    expect(screen.getByText("Sofi")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByText("1 de 2 pedidos")).toBeInTheDocument();
  });

  it("edits an order, status included, keeping its agreed price", async () => {
    const { user } = renderOrders([pedido({ client: "Sofi", price: 4000, paid: 1000 })]);
    await user.click(within(card("Sofi")).getByRole("button", { name: "Editar" }));
    const form = within(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Editar pedido");
    expect(form.getByLabelText("Precio acordado")).toHaveValue(4000);
    expect(form.getByLabelText("Unidades de producto 1")).toHaveValue(16);
    await user.type(form.getByLabelText("Hora"), "11:00");
    await user.selectOptions(form.getByLabelText("Estado"), "Confirmado");
    await user.clear(form.getByLabelText("Cobrado"));
    await user.type(form.getByLabelText("Cobrado"), "4000");
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));
    expect(useRecipeStore.getState().orders[0]).toMatchObject({
      dueTime: "11:00",
      status: "confirmed",
      price: 4000,
      paid: 4000,
    });
    expect(within(card("Sofi")).getByText("Pagado")).toBeInTheDocument();
  });

  it("repeats an order as a new one: no date, today's proposed price, nothing paid", async () => {
    const original = pedido({
      client: "Sofi",
      contact: "@sofi.ok",
      dueTime: "17:30",
      delivery: "delivery",
      notes: "Sin nueces",
      price: 4000,
      paid: 4000,
      status: "delivered",
      stockMove: { lots: [] },
      customization: { items: [{ ingredientId: "colorante", quantity: 3 }], feeType: "amount", fee: 1500 },
    });
    const { user } = renderOrders([original]);
    await user.selectOptions(screen.getByLabelText("Mostrar"), "Todos");
    await user.click(within(card("Sofi")).getByRole("button", { name: "Repetir" }));
    const form = within(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Repetir pedido");
    expect(form.getByLabelText("Cliente")).toHaveValue("Sofi");
    expect(form.getByLabelText("Contacto")).toHaveValue("@sofi.ok");
    expect(form.getByLabelText("Fecha de entrega")).toHaveValue("");
    expect(form.getByLabelText("Hora")).toHaveValue("17:30");
    expect(form.getByLabelText("Unidades de producto 1")).toHaveValue(16);
    expect(form.getByLabelText("Insumo de decoración 1")).toHaveDisplayValue("Colorante naranja");
    expect(form.getByLabelText("Recargo por diseño")).toHaveValue(1500);
    expect(form.getByLabelText("Cobrado")).toHaveValue(null);
    expect(form.queryByLabelText("Estado")).not.toBeInTheDocument();
    // 16 × 200 (suggested) + 3 × 100 (decoration at cost) + 1500 (fee), not the 4000 agreed.
    const proposed = 16 * 200 + 300 + 1500;
    expect(form.getByLabelText("Precio acordado")).toHaveValue(proposed);

    await user.clear(form.getByLabelText("Cliente"));
    await user.type(form.getByLabelText("Cliente"), "Ana");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-10-24");
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));

    const [kept, repeated] = useRecipeStore.getState().orders;
    expect(kept).toEqual(original);
    expect(repeated).toEqual({
      id: expect.any(String),
      createdAt: expect.any(Number),
      client: "Ana",
      contact: "@sofi.ok",
      dueDate: "2026-10-24",
      dueTime: "17:30",
      delivery: "delivery",
      notes: "Sin nueces",
      items: [{ recipeId: "cookies", quantity: 16 }],
      packagingItems: [],
      customization: { items: [{ ingredientId: "colorante", quantity: 3 }], feeType: "amount", fee: 1500 },
      price: proposed,
      paid: 0,
      status: "pending",
    });
    expect(repeated.id).not.toBe(original.id);
    expect(screen.getByRole("status", { name: "Notificaciones" })).toHaveTextContent(
      "Pedido guardado",
    );
  });

  it("records a past order as delivered without touching the stock, even when it is short", async () => {
    const { user } = renderOrders();
    await user.click(screen.getByRole("button", { name: "Nuevo pedido" }));
    const form = within(screen.getByRole("dialog"));
    await user.type(form.getByLabelText("Cliente"), "Sofi");
    await user.type(form.getByLabelText("Fecha de entrega"), "2026-09-12");
    await user.click(form.getByRole("button", { name: /Agregar producto/ }));
    await user.selectOptions(form.getByLabelText("Producto 1"), "Cookies");
    // 200 cookies need 20000 g of harina (there are 10000); 6 boxes (there are 5).
    await user.clear(form.getByLabelText("Unidades de producto 1"));
    await user.type(form.getByLabelText("Unidades de producto 1"), "200");
    await user.click(form.getByRole("button", { name: /Agregar packaging/ }));
    await user.selectOptions(form.getByLabelText("Packaging 1"), "Box x8");
    await user.clear(form.getByLabelText("Cantidad de packaging 1"));
    await user.type(form.getByLabelText("Cantidad de packaging 1"), "6");
    const delivered = form.getByRole("checkbox", { name: "Ya entregado" });
    expect(delivered).not.toBeChecked();
    expect(delivered).toHaveAccessibleDescription(
      "Para registrar un pedido que ya hiciste: queda como Entregado y no descuenta stock.",
    );
    await user.click(delivered);
    await user.click(form.getByRole("button", { name: "Guardar pedido" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const state = useRecipeStore.getState();
    expect(state.orders).toEqual([
      expect.objectContaining({ client: "Sofi", dueDate: "2026-09-12", status: "delivered" }),
    ]);
    expect(state.orders[0]).not.toHaveProperty("stockMove");
    expect(state.ingredients.find((item) => item.id === "harina").stock).toBe(10000);
    expect(state.packaging.find((item) => item.id === "box").stock).toBe(5);
    expect(state.finishedGoods ?? []).toEqual([]);
    expect(screen.getByRole("status", { name: "Notificaciones" })).toHaveTextContent(
      "Pedido guardado como entregado",
    );
    await user.selectOptions(screen.getByLabelText("Mostrar"), "Todos");
    expect(screen.getByLabelText("Estado del pedido de Sofi")).toHaveDisplayValue("Entregado");
  });

  it("offers recording as delivered only on a new order", async () => {
    const { user } = renderOrders([pedido({ client: "Sofi" })]);
    await user.click(within(card("Sofi")).getByRole("button", { name: "Editar" }));
    expect(
      within(screen.getByRole("dialog")).queryByRole("checkbox", { name: "Ya entregado" }),
    ).not.toBeInTheDocument();
  });

  it("warns when a product of the order was deleted", () => {
    renderOrders([pedido({ client: "Sofi", items: [{ recipeId: "borrada", quantity: 3 }] })]);
    expect(within(card("Sofi")).getByText(/3 \(receta eliminada\)/)).toBeInTheDocument();
  });

  it("asks before deleting an order", async () => {
    const { user } = renderOrders([pedido({ client: "Sofi" }), pedido({ client: "Ana" })]);
    await user.click(within(card("Sofi")).getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent('¿Eliminar el pedido de "Sofi"?');
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(useRecipeStore.getState().orders.map((order) => order.client)).toEqual(["Ana"]);
  });
});
