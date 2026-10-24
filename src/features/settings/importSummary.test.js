import { describe, expect, it } from "vitest";
import { importSummary } from "./importSummary";

const list = (count) => Array.from({ length: count }, (_, index) => index);

describe("importSummary", () => {
  it("summarizes what was imported", () => {
    expect(
      importSummary({ ingredients: list(3), recipes: list(2), skipped: 0 }),
    ).toBe("Importamos 3 insumos y 2 recetas");
  });

  it("counts skipped records", () => {
    expect(
      importSummary({ ingredients: list(1), recipes: list(1), skipped: 1 }),
    ).toBe("Importamos 1 insumos y 1 recetas · 1 registro omitido por datos inválidos");
    expect(
      importSummary({ ingredients: list(1), recipes: list(1), skipped: 2 }),
    ).toBe("Importamos 1 insumos y 1 recetas · 2 registros omitidos por datos inválidos");
  });

  it("says when nothing valid was found", () => {
    expect(
      importSummary({ ingredients: [], recipes: [], skipped: 2 }),
    ).toBe("No encontramos registros válidos · 2 registros omitidos por datos inválidos");
  });

  it("reports a backup that only brings categories", () => {
    expect(
      importSummary({
        ingredients: [],
        recipes: [],
        recipeCategories: list(2),
        skipped: 0,
      }),
    ).toBe("Importamos 2 categorías");
  });

  it("adds the packaging when the backup brings some", () => {
    expect(
      importSummary({ ingredients: list(3), recipes: list(2), packaging: list(4), skipped: 0 }),
    ).toBe("Importamos 3 insumos, 2 recetas y 4 packaging");
    expect(
      importSummary({ ingredients: [], recipes: [], packaging: list(1), skipped: 1 }),
    ).toBe("Importamos 1 packaging · 1 registro omitido por datos inválidos");
  });

  it("adds the orders when the backup brings some", () => {
    expect(
      importSummary({ ingredients: list(3), recipes: list(2), packaging: list(4), orders: list(2), skipped: 0 }),
    ).toBe("Importamos 3 insumos, 2 recetas, 4 packaging y 2 pedidos");
    expect(
      importSummary({ ingredients: list(3), recipes: list(2), orders: list(1), skipped: 0 }),
    ).toBe("Importamos 3 insumos, 2 recetas y 1 pedido");
    expect(
      importSummary({ ingredients: [], recipes: [], orders: list(5), skipped: 0 }),
    ).toBe("Importamos 5 pedidos");
  });
});
