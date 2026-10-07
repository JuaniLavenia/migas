import { describe, expect, it } from "vitest";
import { importSummary } from "./importSummary";

const list = (count) => Array.from({ length: count }, (_, index) => index);

describe("importSummary", () => {
  it("summarizes what was imported", () => {
    expect(
      importSummary({ ingredients: list(3), recipes: list(2), skipped: 0 }),
    ).toBe("Importamos 3 insumos y 2 recetas");
  });

  it("mentions imported photos", () => {
    expect(
      importSummary({
        ingredients: list(3),
        recipes: list(2),
        skipped: 0,
        images: { imported: 1, skipped: 0 },
      }),
    ).toBe("Importamos 3 insumos y 2 recetas con 1 foto");
    expect(
      importSummary({
        ingredients: list(0),
        recipes: list(2),
        skipped: 0,
        images: { imported: 2, skipped: 0 },
      }),
    ).toBe("Importamos 0 insumos y 2 recetas con 2 fotos");
  });

  it("counts skipped records and photos", () => {
    expect(
      importSummary({
        ingredients: list(1),
        recipes: list(1),
        skipped: 1,
        images: { imported: 0, skipped: 2 },
      }),
    ).toBe(
      "Importamos 1 insumos y 1 recetas · 1 registro omitido por datos inválidos · 2 fotos omitidas",
    );
    expect(
      importSummary({
        ingredients: list(1),
        recipes: list(1),
        skipped: 2,
        images: { imported: 1, skipped: 1 },
      }),
    ).toBe(
      "Importamos 1 insumos y 1 recetas con 1 foto · 2 registros omitidos por datos inválidos · 1 foto omitida",
    );
  });

  it("says when nothing valid was found", () => {
    expect(
      importSummary({ ingredients: [], recipes: [], skipped: 2 }),
    ).toBe("No encontramos registros válidos · 2 registros omitidos por datos inválidos");
  });
});
