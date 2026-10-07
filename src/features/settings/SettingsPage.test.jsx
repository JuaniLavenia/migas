import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { getImageStore, setImageStore } from "../../lib/images/imageStore";
import { createMemoryImageStore } from "../../lib/images/memoryImageStore";

const defaultStore = getImageStore();
const demo = useRecipeStore.getState();
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

afterEach(() => setImageStore(defaultStore));

async function exportBackup(user) {
  await user.click(screen.getByRole("button", { name: /Descargar backup/ }));
  await screen.findByText("Backup descargado");
  const backup = downloads.find((blob) => blob.type === "application/json");
  return readText(backup);
}

describe("backup with photos", () => {
  it("exports the photos and restores them on a clean browser", async () => {
    const images = createMemoryImageStore();
    setImageStore(images);
    const imageId = await images.save(
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }),
    );
    const first = renderApp({
      route: "/configuracion",
      state: {
        recipes: demo.recipes.map((recipe) =>
          recipe.id === "cookies" ? { ...recipe, imageId } : recipe,
        ),
      },
    });
    const text = await exportBackup(first.user);
    const parsed = JSON.parse(text);
    expect(parsed.images).toEqual({
      [imageId]: "data:image/webp;base64,AQID",
    });
    expect(parsed.recipes.find((recipe) => recipe.id === "cookies").imageId).toBe(
      imageId,
    );

    // A clean browser: no recipes, no images.
    first.unmount();
    const fresh = createMemoryImageStore();
    setImageStore(fresh);
    const second = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [] },
    });
    await second.user.upload(
      screen.getByLabelText("Archivo de backup"),
      new File([text], "miga-backup.json", { type: "application/json" }),
    );
    expect(
      await screen.findByText("Importamos 5 insumos y 2 recetas con 1 foto"),
    ).toBeInTheDocument();
    const restored = useRecipeStore.getState().getRecipe("cookies");
    const [stored] = await fresh.list();
    expect(restored.imageId).toBe(stored.id);
    expect(restored.imageId).not.toBe(imageId);
    expect(useRecipeStore.getState().getRecipe("brownie")).not.toHaveProperty(
      "imageId",
    );
  });

  it("imports the recipe without its photo when the photo is invalid", async () => {
    const images = createMemoryImageStore();
    setImageStore(images);
    const { user } = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [] },
    });
    const backup = {
      ingredients: demo.ingredients,
      recipes: [{ ...demo.recipes[0], imageId: "broken" }],
      images: { broken: "data:text/html;base64,PHA+" },
    };
    await user.upload(
      screen.getByLabelText("Archivo de backup"),
      new File([JSON.stringify(backup)], "b.json", { type: "application/json" }),
    );
    expect(
      await screen.findByText(
        "Importamos 5 insumos y 1 recetas · 1 foto omitida",
      ),
    ).toBeInTheDocument();
    expect(useRecipeStore.getState().recipes).toHaveLength(1);
    expect(useRecipeStore.getState().recipes[0]).not.toHaveProperty("imageId");
    expect(await images.list()).toEqual([]);
  });

  it("keeps importing old backups without photos", async () => {
    setImageStore(createMemoryImageStore());
    const { user } = renderApp({
      route: "/configuracion",
      state: { ingredients: [], recipes: [] },
    });
    const backup = { ingredients: demo.ingredients, recipes: demo.recipes };
    await user.upload(
      screen.getByLabelText("Archivo de backup"),
      new File([JSON.stringify(backup)], "b.json", { type: "application/json" }),
    );
    expect(
      await screen.findByText("Importamos 5 insumos y 2 recetas"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(useRecipeStore.getState().recipes).toHaveLength(2),
    );
  });
});
