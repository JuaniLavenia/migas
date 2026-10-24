import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";
import { currency } from "../../lib/format";

// Cookies cost 100 per unit and sell at 300; tortas cost 1000, sell at 2500.
const harina = { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1000, stock: 0 };
const cookies = { id: "cookies", name: "Cookies", yield: 21, margin: 0, extras: 0, salePrice: 300, updatedAt: 1, items: [{ ingredientId: "harina", quantity: 2100 }] };
const torta = { ...cookies, id: "torta", name: "Torta", yield: 1, salePrice: 2500, items: [{ ingredientId: "harina", quantity: 1000 }] };

const pedido = (fields) => ({
  id: fields.client,
  contact: "",
  dueDate: "2026-10-10",
  dueTime: "",
  delivery: "pickup",
  notes: "",
  items: [],
  packagingItems: [],
  price: 0,
  paid: 0,
  status: "delivered",
  createdAt: 1,
  ...fields,
});

const orders = [
  // October: collected 6000 + 2500 = 8500; cost 3000 + 1000 = 4000.
  pedido({ client: "Sofi", items: [{ recipeId: "cookies", quantity: 30 }], price: 9000, paid: 6000 }),
  pedido({ client: "Ana", items: [{ recipeId: "torta", quantity: 1 }], price: 2500, paid: 2500 }),
  // Coming up.
  pedido({ client: "Luz", status: "confirmed", dueDate: "2026-10-25", dueTime: "17:30", items: [{ recipeId: "cookies", quantity: 16 }], price: 4800, paid: 1000 }),
  pedido({ client: "Eva", status: "ready", dueDate: "2026-10-22", items: [{ recipeId: "torta", quantity: 1 }], price: 2500 }),
  pedido({ client: "Lejana", status: "confirmed", dueDate: "2026-11-15", price: 1000 }),
  // September: collected 5000, cost 1000.
  pedido({ client: "Septiembre", dueDate: "2026-09-12", items: [{ recipeId: "cookies", quantity: 10 }], price: 5000, paid: 5000 }),
];

function renderDashboard(state = {}) {
  return renderApp({
    state: {
      ingredients: [harina],
      recipes: [cookies, torta],
      packaging: [],
      orders,
      finishedGoods: [
        { id: "viejo", recipeId: "cookies", quantity: 5, madeAt: "2026-10-18" },
        { id: "fresco", recipeId: "cookies", quantity: 3, madeAt: "2026-10-23" },
      ],
      ...state,
    },
  });
}

const money = (value) => currency.format(value).replace(/\s/g, " ");
const card = (label) => screen.getByText(label, { selector: ".stat-card span" }).closest(".stat-card");
const panel = (name) => screen.getByRole("region", { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 24, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Dashboard", { timeout: 15000 }, () => {
  it("replaces the overview at Resumen", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cómo va tu negocio.");
    expect(screen.queryByText("Receta seleccionada")).toBeNull();
    expect(screen.getByText("Octubre 2026")).toBeInTheDocument();
  });

  it("shows the month's sales, real profit with its margin, orders and what is owed", () => {
    renderDashboard();
    expect(card("Ventas")).toHaveTextContent(money(8500));
    // 8500 vs 5000: +70%.
    expect(card("Ventas")).toHaveTextContent("▲ 70% vs septiembre");
    // 4500 profit, 53% margin; 4500 vs 4000: +13%.
    expect(card("Ganancia real")).toHaveTextContent(money(4500));
    expect(card("Ganancia real")).toHaveTextContent("Margen 53% · ▲ 13% vs septiembre");
    // Sofi, Ana, Luz and Eva in October; 1 in September.
    expect(card("Pedidos")).toHaveTextContent("4");
    expect(card("Pedidos")).toHaveTextContent("▲ 300% vs septiembre");
    // Sofi owes 3000, Luz 3800 (señado); Eva is not señado nor delivered.
    expect(card("Saldo por cobrar")).toHaveTextContent(money(6800));
  });

  it("moves to other months", async () => {
    const { user } = renderDashboard();
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Septiembre 2026")).toBeInTheDocument();
    expect(card("Ventas")).toHaveTextContent(money(5000));
    expect(card("Ventas")).toHaveTextContent("Sin ventas en agosto");
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
    expect(card("Ventas")).toHaveTextContent("▼ 100% vs octubre");
  });

  it("lists the deliveries of the next 7 days, late ones first", () => {
    renderDashboard();
    const items = within(panel("Próximas entregas")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Eva.*Atrasado/),
      expect.stringMatching(/^Luz.*17:30/),
    ]);
    expect(within(panel("Próximas entregas")).getByRole("link", { name: /Ver pedidos/ })).toHaveAttribute(
      "href",
      "/pedidos",
    );
  });

  it("points to the shopping list when something is missing", async () => {
    const { user } = renderDashboard();
    // Luz's 16 cookies minus 8 made: one batch, 2100 g of flour, she has 0.
    expect(panel("Para comprar")).toHaveTextContent("Te falta 1 cosa para los pedidos pendientes.");
    await user.click(within(panel("Para comprar")).getByRole("link", { name: /Ver lista de compras/ }));
    expect(currentPath()).toBe("/compras");
  });

  it("warns about finished goods older than 3 days", () => {
    renderDashboard();
    const old = within(panel("Elaborados viejos"));
    expect(old.getByText("5 Cookies · hace 6 días")).toBeInTheDocument();
    expect(old.queryByText(/3 Cookies/)).toBeNull();
  });

  it("ranks the month's recipes by units sold and by profit", () => {
    renderDashboard();
    const recipes = within(panel("Recetas del mes"));
    const sold = within(recipes.getByRole("list", { name: "Más vendidas" }));
    expect(sold.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Cookies30 un",
      "Torta1 un",
    ]);
    // Cookies: 30 × 200 = 6000; torta: 1500.
    const profitable = within(recipes.getByRole("list", { name: "Más ganancia" }));
    expect(profitable.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      // Raw textContent keeps Intl's no-break space.
      `Cookies${currency.format(6000)}`,
      `Torta${currency.format(1500)}`,
    ]);
  });

  it("invites to load orders when there are none", () => {
    renderDashboard({ orders: [], finishedGoods: [] });
    expect(screen.getByText("Todavía no cargaste pedidos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cargar un pedido/ })).toHaveAttribute("href", "/pedidos");
  });
});
