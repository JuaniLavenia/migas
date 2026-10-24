import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { currentPath, renderApp } from "./test/renderApp";
import useRecipeStore from "./stores/useRecipeStore";

describe("Dashboard navigation", () => {
  it("exposes its shortcuts as links", () => {
    renderApp();
    expect(screen.getByRole("link", { name: /Ver pedidos/ })).toHaveAttribute("href", "/pedidos");
    expect(
      screen.getByRole("link", { name: /Ver lista de compras/ }),
    ).toHaveAttribute("href", "/compras");
    expect(screen.getByRole("link", { name: /Ver elaborados/ })).toHaveAttribute(
      "href",
      "/elaborados",
    );
  });

  it("opens the orders from a shortcut", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("link", { name: /Ver pedidos/ }));
    expect(currentPath()).toBe("/pedidos");
  });
});

describe("Recipe editor semantics", () => {
  it("marks the open recipe in the library and keeps heading levels", () => {
    const [, second] = useRecipeStore.getState().recipes;
    renderApp({ route: `/recetas/${second.id}` });
    const current = document.querySelector(".selector-item[aria-current]");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent(second.name);
    expect(document.querySelectorAll(".selector-item[aria-current]")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: "Insumos utilizados" }),
    ).toBeInTheDocument();
  });
});

describe("App shell", () => {
  it("has no dead profile control and a Spanish breadcrumb", () => {
    renderApp();
    expect(screen.queryByRole("button", { name: "Mi perfil" })).toBeNull();
    expect(screen.queryByText("Workspace")).toBeNull();
  });
});
