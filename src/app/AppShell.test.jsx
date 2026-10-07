import { afterEach, describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderApp } from "../test/renderApp";
import useToastStore from "../stores/useToastStore";

// jsdom has no matchMedia: emulate a phone (sidebar as a drawer) or a desktop
// viewport for the "(max-width: 680px)" query.
function setViewport({ mobile }) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query) => ({
      matches: mobile,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

afterEach(() => {
  delete window.matchMedia;
});

function sidebar() {
  return document.getElementById("app-sidebar");
}

function menuButton() {
  return screen.getByRole("button", { name: "Abrir menú" });
}

describe("Mobile sidebar", () => {
  it("keeps the closed drawer out of the tab order", () => {
    setViewport({ mobile: true });
    renderApp();
    expect(sidebar()).toHaveAttribute("inert");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("opens with focus inside and closes with Escape back to the menu button", async () => {
    setViewport({ mobile: true });
    const { user } = renderApp();
    await user.click(menuButton());

    expect(sidebar()).not.toHaveAttribute("inert");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(sidebar()).toContainElement(document.activeElement);

    await user.keyboard("{Escape}");
    expect(sidebar()).toHaveAttribute("inert");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("returns focus to the menu button when closed with its button", async () => {
    setViewport({ mobile: true });
    const { user } = renderApp();
    await user.click(menuButton());
    await user.click(screen.getByRole("button", { name: "Cerrar menú" }));

    expect(sidebar()).toHaveAttribute("inert");
    expect(menuButton()).toHaveFocus();
  });

  it("leaves the desktop sidebar usable", () => {
    setViewport({ mobile: false });
    renderApp();
    expect(sidebar()).not.toHaveAttribute("inert");
  });
});

describe("Toast region", () => {
  it("is mounted before any toast and announces it", () => {
    renderApp();
    const region = screen.getByRole("status", { name: "Notificaciones" });
    expect(region).toBeEmptyDOMElement();

    act(() => useToastStore.getState().showToast("Insumo guardado"));
    expect(region).toHaveTextContent("Insumo guardado");
    expect(screen.getByRole("status", { name: "Notificaciones" })).toBe(region);
  });
});
