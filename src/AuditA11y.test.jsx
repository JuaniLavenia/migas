import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { currentPath, renderApp } from "./test/renderApp";
import useRecipeStore from "./stores/useRecipeStore";

describe("Overview navigation", () => {
  it("exposes recipe rows and shortcuts as links", () => {
    renderApp();
    const [first] = useRecipeStore.getState().recipes;
    const library = screen
      .getByRole("heading", { name: "Tus recetas" })
      .closest("section");
    const rows = within(library).getAllByRole("link", {
      name: new RegExp(first.name),
    });
    expect(rows[0]).toHaveAttribute("href", `/recetas/${first.id}`);
    expect(
      within(library).getByRole("link", { name: /Ver todas/ }),
    ).toHaveAttribute("href", "/recetas");
    expect(screen.getByRole("link", { name: /Ver detalle/ })).toHaveAttribute(
      "href",
      `/recetas/${first.id}`,
    );
    expect(
      screen.getByRole("link", { name: /Cargar un insumo/ }),
    ).toHaveAttribute("href", "/insumos");
  });

  it("still opens a recipe from the overview", async () => {
    const { user } = renderApp();
    const [first] = useRecipeStore.getState().recipes;
    await user.click(screen.getByRole("link", { name: /Ver detalle/ }));
    expect(currentPath()).toBe(`/recetas/${first.id}`);
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
