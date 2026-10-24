import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { demoIngredients, demoRecipes } from "../../stores/demoData";

const PHOTO = "https://res.cloudinary.com/miga/image/upload/v1/brownie.jpg";
let downloads;

function readText(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  downloads = [];
  // jsdom has no object URLs and does not download: capture the blob.
  URL.createObjectURL = vi.fn((blob) => {
    downloads.push(blob);
    return `blob:test/${downloads.length}`;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

async function exportBackup(user) {
  await user.click(screen.getByRole("button", { name: /Descargar backup/ }));
  await screen.findByText("Backup descargado");
  const backup = downloads.find((blob) => blob.type === "application/json");
  return readText(backup);
}

async function importBackup(user, data) {
  await user.upload(
    screen.getByLabelText("Archivo de backup"),
    new File([typeof data === "string" ? data : JSON.stringify(data)], "b.json", {
      type: "application/json",
    }),
  );
}

describe("backup", () => {
  it("exports and restores categories, sale prices and photo links", async () => {
    const first = renderApp({
      route: "/configuracion",
      state: {
        recipeCategories: [{ id: "budines", name: "Budines" }],
        recipes: demoRecipes.map((recipe) =>
          recipe.id === "brownie"
            ? { ...recipe, categoryId: "budines", salePrice: 1500, imageUrl: PHOTO }
            : recipe,
        ),
      },
    });
    const text = await exportBackup(first.user);
    const parsed = JSON.parse(text);
    expect(parsed.recipeCategories).toEqual([{ id: "budines", name: "Budines" }]);
    expect(parsed).not.toHaveProperty("images");

    first.unmount();
    const second = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [], recipeCategories: [] },
    });
    await importBackup(second.user, text);
    expect(
      await screen.findByText("Importamos 5 insumos y 2 recetas"),
    ).toBeInTheDocument();
    const state = useRecipeStore.getState();
    expect(state.recipeCategories).toEqual([{ id: "budines", name: "Budines" }]);
    expect(state.getRecipe("brownie")).toMatchObject({
      categoryId: "budines",
      salePrice: 1500,
      imageUrl: PHOTO,
    });
  });

  it("exports and restores packaging and the stock of each ingredient", async () => {
    const bolsa = { id: "bolsa", name: "Bolsa individual", packSize: 100, packCost: 5000, stock: 40 };
    const first = renderApp({
      route: "/configuracion",
      state: {
        ingredients: [{ ...demoIngredients[0], stock: 2500 }],
        recipes: [],
        packaging: [bolsa],
      },
    });
    const parsed = JSON.parse(await exportBackup(first.user));
    expect(parsed.packaging).toEqual([bolsa]);
    expect(parsed.ingredients[0].stock).toBe(2500);

    first.unmount();
    const second = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [], packaging: [] },
    });
    await importBackup(second.user, parsed);
    expect(
      await screen.findByText("Importamos 1 insumos, 0 recetas y 1 packaging"),
    ).toBeInTheDocument();
    const state = useRecipeStore.getState();
    expect(state.packaging).toEqual([bolsa]);
    expect(state.ingredients[0].stock).toBe(2500);
  });

  it("imports a backup that only brings packaging", async () => {
    const { user } = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [], packaging: [] },
    });
    await importBackup(user, {
      ingredients: [],
      recipes: [],
      packaging: [{ id: "box", name: "Box x8", packSize: 10, packCost: 9000 }],
    });
    expect(await screen.findByText("Importamos 1 packaging")).toBeInTheDocument();
    expect(useRecipeStore.getState().packaging).toEqual([
      { id: "box", name: "Box x8", packSize: 10, packCost: 9000 },
    ]);
  });

  it("exports and restores the orders", async () => {
    const pedido = {
      id: "o-1",
      client: "Sofi",
      contact: "@sofi",
      dueDate: "2026-10-25",
      dueTime: "17:30",
      delivery: "pickup",
      notes: "",
      items: [],
      packagingItems: [],
      price: 24000,
      paid: 0,
      status: "confirmed",
      createdAt: 1767225600000,
    };
    const first = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [], orders: [pedido] },
    });
    const parsed = JSON.parse(await exportBackup(first.user));
    expect(parsed.orders).toEqual([pedido]);

    first.unmount();
    const second = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [], orders: [] },
    });
    await importBackup(second.user, parsed);
    expect(await screen.findByText("Importamos 1 pedido")).toBeInTheDocument();
    expect(useRecipeStore.getState().orders).toEqual([pedido]);
  });

  it("imports an old backup with embedded photos, without the photos", async () => {
    const { user } = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [] },
    });
    await importBackup(user, {
      ingredients: demoIngredients,
      recipes: [{ ...demoRecipes[0], imageId: "img-1" }],
      images: { "img-1": "data:image/webp;base64,AQID" },
    });
    expect(
      await screen.findByText("Importamos 5 insumos y 1 recetas"),
    ).toBeInTheDocument();
    const [recipe] = useRecipeStore.getState().recipes;
    expect(recipe).not.toHaveProperty("imageId");
    expect(recipe).not.toHaveProperty("imageUrl");
  });

  it("rejects a file that is not a backup and leaves the data alone", async () => {
    const { user } = renderApp({ route: "/configuracion" });
    const before = useRecipeStore.getState().recipes;
    await importBackup(user, "no es json");
    expect(
      await screen.findByText("No pudimos leer ese archivo: no es un backup válido"),
    ).toBeInTheDocument();
    expect(useRecipeStore.getState().recipes).toBe(before);
  });
});
