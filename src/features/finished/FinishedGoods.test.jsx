import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";

const cookies = { id: "cookies", name: "Cookies", yield: 21, margin: 0, extras: 0, updatedAt: 1, items: [] };
const torta = { ...cookies, id: "torta", name: "Torta", yield: 1 };
const viejo = { id: "viejo", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" };
const nuevo = { id: "nuevo", recipeId: "cookies", quantity: 10, madeAt: "2026-10-22" };
const huerfano = { id: "huerfano", recipeId: "borrada", quantity: 2, madeAt: "2026-10-23" };

function renderFinished(finishedGoods = [nuevo, viejo], route = "/elaborados") {
  return renderApp({
    route,
    state: { ingredients: [], recipes: [cookies, torta], finishedGoods },
  });
}

const navItem = (name) =>
  within(screen.getByRole("navigation")).getByRole("link", { name });
const group = (name) => screen.getByRole("region", { name });
const lotRow = (text) => screen.getByText(text).closest(".finished-row");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 23, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Finished goods", { timeout: 15000 }, () => {
  it("has its own view in the sidebar", async () => {
    const { user } = renderFinished([nuevo, viejo], "/");
    await user.click(navItem(/^Elaborados 2/));
    expect(currentPath()).toBe("/elaborados");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tus elaborados.");
  });

  it("lists each batch by recipe, oldest first, with its age", () => {
    renderFinished([nuevo, viejo, huerfano]);
    const cookiesGroup = within(group("Cookies"));
    expect(cookiesGroup.getByText("15 un")).toBeInTheDocument();
    const rows = cookiesGroup.getAllByText(/^Hecho /).map((node) => node.textContent);
    expect(rows).toEqual(["Hecho hace 3 días", "Hecho ayer"]);
    expect(within(group("Receta eliminada")).getByText("Hecho hoy")).toBeInTheDocument();
  });

  it("invites to load them when there are none", async () => {
    const { user } = renderFinished([]);
    expect(screen.getByText("No tenés elaborados guardados.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cargar los primeros elaborados/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Cargar elaborados");
  });

  it("adds a batch by hand, made today unless she says otherwise", async () => {
    const { user } = renderFinished([]);
    await user.click(screen.getByRole("button", { name: /Cargar elaborados/ }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByLabelText("Hecho el")).toHaveValue("2026-10-23");
    await user.selectOptions(form.getByLabelText("Receta"), "Torta");
    await user.clear(form.getByLabelText("Unidades"));
    await user.type(form.getByLabelText("Unidades"), "3");
    await user.click(form.getByRole("button", { name: "Guardar elaborados" }));
    expect(useRecipeStore.getState().finishedGoods).toEqual([
      { id: expect.any(String), recipeId: "torta", quantity: 3, madeAt: "2026-10-23" },
    ]);
    expect(within(group("Torta")).getByText("Hecho hoy")).toBeInTheDocument();
  });

  it("changes the units of a batch", async () => {
    const { user } = renderFinished();
    await user.click(
      within(lotRow("Hecho hace 3 días")).getByRole("button", { name: "Editar" }),
    );
    const form = within(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Editar elaborados");
    expect(form.getByLabelText("Unidades")).toHaveValue(5);
    await user.clear(form.getByLabelText("Unidades"));
    await user.type(form.getByLabelText("Unidades"), "2");
    await user.click(form.getByRole("button", { name: "Guardar elaborados" }));
    expect(useRecipeStore.getState().finishedGoods).toEqual([nuevo, { ...viejo, quantity: 2 }]);
  });

  it("asks before discarding a batch", async () => {
    const { user } = renderFinished();
    await user.click(
      within(lotRow("Hecho hace 3 días")).getByRole("button", { name: "Descartar" }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Descartar 5 Cookies de hace 3 días?");
    await user.click(within(dialog).getByRole("button", { name: "Descartar" }));
    expect(useRecipeStore.getState().finishedGoods).toEqual([nuevo]);
  });
});
