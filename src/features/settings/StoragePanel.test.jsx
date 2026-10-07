import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../../test/renderApp";
import useRecipeStore from "../../stores/useRecipeStore";
import { getImageStore, setImageStore } from "../../lib/images/imageStore";
import { createMemoryImageStore } from "../../lib/images/memoryImageStore";

const MB = 1024 * 1024;
const GB = 1024 * MB;
const defaultStore = getImageStore();
const demoRecipes = useRecipeStore.getState().recipes;

// jsdom has no StorageManager: each test installs a fake navigator.storage.
function mockStorage(storage) {
  Object.defineProperty(navigator, "storage", {
    value: storage,
    configurable: true,
  });
}

function fakeStorage({ usage = 3 * MB, quota = 2 * GB, persisted = false } = {}) {
  return {
    estimate: vi.fn(async () => ({ usage, quota })),
    persisted: vi.fn(async () => persisted),
    persist: vi.fn(async () => true),
  };
}

async function renderWithImages(sizes) {
  const images = createMemoryImageStore();
  setImageStore(images);
  const ids = [];
  for (const size of sizes) {
    ids.push(await images.save(new Blob([new Uint8Array(size)])));
  }
  // Referenced, so the startup cleanup keeps them.
  const recipes = demoRecipes.map((recipe, index) =>
    ids[index] ? { ...recipe, imageId: ids[index] } : recipe,
  );
  return renderApp({ route: "/configuracion", state: { recipes } });
}

function panel() {
  return screen.getByRole("region", { name: "Almacenamiento" });
}

beforeEach(() => mockStorage(fakeStorage()));

afterEach(() => {
  setImageStore(defaultStore);
  delete navigator.storage;
});

describe("storage panel", () => {
  it("shows the photos, the usage against the quota and the backup hint", async () => {
    await renderWithImages([300 * 1024, 200 * 1024]);
    expect(
      await within(panel()).findByText("2 fotos · 500 KB"),
    ).toBeInTheDocument();
    const meter = await within(panel()).findByRole("meter", {
      name: "Espacio usado",
    });
    expect(meter).toHaveAttribute("aria-valuenow", String(3 * MB));
    expect(meter).toHaveAttribute("aria-valuemax", String(2 * GB));
    expect(within(panel()).getByText("3 MB de 2 GB")).toBeInTheDocument();
    expect(within(panel()).getByText(/backups incluyen las fotos/)).toBeInTheDocument();
    expect(within(panel()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns when more than 80% of the quota is used", async () => {
    mockStorage(fakeStorage({ usage: 90 * MB, quota: 100 * MB }));
    await renderWithImages([]);
    expect(await within(panel()).findByRole("alert")).toHaveTextContent(
      "casi lleno (90%)",
    );
  });

  it("asks the browser to protect the storage and shows the result", async () => {
    const storage = fakeStorage({ persisted: false });
    mockStorage(storage);
    const { user } = await renderWithImages([]);
    expect(
      await within(panel()).findByText(/puede borrar estos datos/),
    ).toBeInTheDocument();
    await user.click(
      within(panel()).getByRole("button", { name: "Proteger almacenamiento" }),
    );
    expect(storage.persist).toHaveBeenCalled();
    expect(
      await within(panel()).findByText(/Almacenamiento protegido/),
    ).toBeInTheDocument();
    expect(
      within(panel()).queryByRole("button", { name: "Proteger almacenamiento" }),
    ).not.toBeInTheDocument();
  });

  it("refreshes on demand", async () => {
    const storage = fakeStorage();
    mockStorage(storage);
    const { user } = await renderWithImages([]);
    await within(panel()).findByText("3 MB de 2 GB");
    storage.estimate.mockResolvedValue({ usage: 5 * MB, quota: 2 * GB });
    await user.click(within(panel()).getByRole("button", { name: "Actualizar" }));
    expect(await within(panel()).findByText("5 MB de 2 GB")).toBeInTheDocument();
  });

  it("degrades gracefully without navigator.storage or IndexedDB", async () => {
    delete navigator.storage;
    setImageStore(createMemoryImageStore({ available: false }));
    renderApp({ route: "/configuracion" });
    expect(
      await within(panel()).findByText("No disponibles en este navegador"),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByText(/no informa cuánto espacio/),
    ).toBeInTheDocument();
    expect(within(panel()).queryByRole("meter")).not.toBeInTheDocument();
    expect(
      within(panel()).queryByRole("button", { name: "Proteger almacenamiento" }),
    ).not.toBeInTheDocument();
  });
});
