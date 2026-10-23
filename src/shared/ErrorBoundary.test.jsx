import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import { RECIPE_STORAGE_KEY } from "../lib/recipeStorage";

function Broken() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("offers to retry and to download this device's data, never to delete it", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem(RECIPE_STORAGE_KEY, "{}");
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Descargar datos de este dispositivo" }),
    ).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Restablecer/ })).toBeNull();
    window.localStorage.clear();
  });
});
