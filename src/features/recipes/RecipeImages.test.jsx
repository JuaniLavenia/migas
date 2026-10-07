import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { getImageStore, setImageStore } from "../../lib/images/imageStore";
import { ImageStoreError } from "../../lib/images/imageStoreErrors";
import { createMemoryImageStore } from "../../lib/images/memoryImageStore";

// jsdom has no canvas or image decoder: the preparation step is replaced by
// one that returns a small WebP blob. Its real behavior is covered by
// lib/images/prepareImage.test.js and the manual smoke test.
vi.mock("../../lib/images/prepareImage", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    prepareImage: vi.fn(async (file) => {
      if (!file.type.startsWith("image/")) {
        throw new actual.ImagePreparationError("not-image");
      }
      return new Blob(["prepared"], { type: "image/webp" });
    }),
  };
});

const defaultStore = getImageStore();
// Demo recipes, captured before any test changes the store.
const demoRecipes = useRecipeStore.getState().recipes;
let images;
let urlCount;

beforeEach(() => {
  images = createMemoryImageStore();
  setImageStore(images);
  // jsdom has no object URLs.
  urlCount = 0;
  URL.createObjectURL = vi.fn(() => `blob:test/${(urlCount += 1)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => setImageStore(defaultStore));

function photoFile(name = "torta.jpg", type = "image/jpeg") {
  return new File(["raw photo"], name, { type });
}

function cookies() {
  return useRecipeStore.getState().getRecipe("cookies");
}

function editor() {
  return screen.getByRole("region", { name: "Foto de la receta" });
}

async function addPhoto(user) {
  await user.upload(await screen.findByLabelText("Agregar foto"), photoFile());
  await screen.findByRole("button", { name: "Quitar foto" });
}

describe("recipe photos", () => {
  it("adds a photo, shows it in the editor and the library, and stores it", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    await addPhoto(user);

    expect(
      within(editor()).getByRole("img", { name: "Cookies de chocolate" }),
    ).toBeInTheDocument();
    const library = screen.getByRole("region", {
      name: "Biblioteca de recetas",
    });
    expect(
      await within(library).findByRole("img", { name: "Cookies de chocolate" }),
    ).toBeInTheDocument();
    // Without a photo the letter avatar stays.
    expect(
      within(library).queryByRole("img", { name: "Brownie clásico" }),
    ).not.toBeInTheDocument();

    const listed = await images.list();
    expect(listed).toHaveLength(1);
    expect(cookies().imageId).toBe(listed[0].id);
    expect(await screen.findByText("Foto guardada")).toBeInTheDocument();
  });

  it("replaces a photo and deletes the previous one", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    await addPhoto(user);
    const firstId = cookies().imageId;

    await user.upload(screen.getByLabelText("Cambiar foto"), photoFile("otra.jpg"));
    await waitFor(() => expect(cookies().imageId).not.toBe(firstId));
    await waitFor(async () => expect(await images.list()).toHaveLength(1));
    expect(await images.get(firstId)).toBeNull();
  });

  it("removes a photo after confirming", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    await addPhoto(user);

    await user.click(screen.getByRole("button", { name: "Quitar foto" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Quitar" }));

    expect(
      await within(editor()).findByLabelText("Agregar foto"),
    ).toBeInTheDocument();
    expect(cookies()).not.toHaveProperty("imageId");
    await waitFor(async () => expect(await images.list()).toEqual([]));
  });

  it("explains a rejected file and leaves the recipe unchanged", async () => {
    renderApp({ route: "/recetas/cookies" });
    const before = cookies();
    // user.upload would filter the file out by the accept attribute, as the
    // browser picker does; a drop or a permissive picker can still send it.
    fireEvent.change(await screen.findByLabelText("Agregar foto"), {
      target: { files: [photoFile("notas.pdf", "application/pdf")] },
    });
    expect(
      await screen.findByText("Ese archivo no es una imagen"),
    ).toBeInTheDocument();
    expect(cookies()).toBe(before);
  });

  it("shows a clear message when there is no space left", async () => {
    images.save = vi.fn(async () => {
      throw new ImageStoreError("quota");
    });
    const { user } = renderApp({ route: "/recetas/cookies" });
    const before = cookies();
    await user.upload(await screen.findByLabelText("Agregar foto"), photoFile());
    expect(
      await screen.findByText(/No hay espacio suficiente para guardar la foto/),
    ).toBeInTheDocument();
    expect(cookies()).toBe(before);
  });

  it("explains that photos are unavailable when the image store cannot be used", async () => {
    setImageStore(createMemoryImageStore({ available: false }));
    renderApp({ route: "/recetas/cookies" });
    expect(
      await within(editor()).findByText(/Las fotos no están disponibles/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Agregar foto")).not.toBeInTheDocument();
  });

  it("deletes the photo together with its recipe", async () => {
    const { user } = renderApp({ route: "/recetas/cookies" });
    await addPhoto(user);

    await user.click(screen.getByRole("button", { name: "Eliminar receta" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );
    await waitFor(async () => expect(await images.list()).toEqual([]));
  });

  it("shows the photo in the overview list", async () => {
    const imageId = await images.save(new Blob(["x"], { type: "image/webp" }));
    renderApp({
      state: {
        recipes: demoRecipes.map((recipe) =>
            recipe.id === "brownie" ? { ...recipe, imageId } : recipe,
          ),
      },
    });
    expect(
      await screen.findByRole("img", { name: "Brownie clásico" }),
    ).toHaveAttribute("src", expect.stringMatching(/^blob:test\//));
  });

  it("removes images no recipe references on startup", async () => {
    const kept = await images.save(new Blob(["a"], { type: "image/webp" }));
    await images.save(new Blob(["b"], { type: "image/webp" }));
    renderApp({
      state: {
        recipes: demoRecipes.map((recipe) =>
            recipe.id === "cookies" ? { ...recipe, imageId: kept } : recipe,
          ),
      },
    });
    await waitFor(async () =>
      expect(await images.list()).toEqual([{ id: kept, size: 1 }]),
    );
  });
});
