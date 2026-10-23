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
});
