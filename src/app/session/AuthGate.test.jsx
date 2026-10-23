import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthGate from "./AuthGate";
import { useSession } from "./SessionContext";
import useRecipeStore from "../../stores/useRecipeStore";
import useSaveStatusStore from "../../stores/useSaveStatusStore";
import { createMemoryRepository } from "../../lib/data/memoryRepository";

const recipe = (id, name = id) => ({
  id,
  name,
  yield: 1,
  margin: 0,
  extras: 0,
  updatedAt: 1000,
  items: [],
});

const ANA = { id: "user-ana", email: "ana@example.com", user_metadata: { full_name: "Ana" } };

// Fake auth port: tests decide who is signed in.
function createFakeAuth(initialUser = null) {
  let listener = null;
  let session = initialUser ? { user: initialUser } : null;
  return {
    signIn: vi.fn(),
    signOut: vi.fn(async () => {
      session = null;
      listener?.(null);
    }),
    onChange(callback) {
      listener = callback;
      queueMicrotask(() => callback(session));
      return () => {
        listener = null;
      };
    },
    emit(user) {
      session = user ? { user } : null;
      listener?.(session);
    },
  };
}

function Probe() {
  const { user, signOut } = useSession();
  const recipes = useRecipeStore((state) => state.recipes);
  return (
    <div>
      <p>Hola {user.email}</p>
      <ul>
        {recipes.map((entry) => (
          <li key={entry.id}>{entry.name}</li>
        ))}
      </ul>
      <button type="button" onClick={signOut}>
        Salir
      </button>
    </div>
  );
}

function setVisibility(state) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

let repository;

beforeEach(() => {
  useRecipeStore.setState({ ingredients: [], recipes: [], recipeCategories: [] });
  useSaveStatusStore.setState({ status: "saved" });
  repository = createMemoryRepository({
    data: { recipes: [recipe("a", "Alfajores")], ingredients: [], recipeCategories: [] },
  });
});

afterEach(() => {
  setVisibility("visible");
});

function renderGate(auth) {
  const user = userEvent.setup();
  render(
    <AuthGate auth={auth} repository={repository} syncOptions={{ delay: 0 }}>
      <Probe />
    </AuthGate>,
  );
  return user;
}

describe("AuthGate", () => {
  it("asks to sign in with Google and shows nothing else", async () => {
    const auth = createFakeAuth();
    const user = renderGate(auth);
    const button = await screen.findByRole("button", { name: /Entrar con Google/ });
    expect(screen.queryByText("Alfajores")).toBeNull();
    await user.click(button);
    expect(auth.signIn).toHaveBeenCalledTimes(1);
  });

  it("loads the business data after signing in and saves changes back", async () => {
    renderGate(createFakeAuth(ANA));
    expect(await screen.findByText("Alfajores")).toBeInTheDocument();
    expect(screen.getByText("Hola ana@example.com")).toBeInTheDocument();
    // Loading did not write anything back.
    expect(repository.writes).toEqual([]);

    act(() =>
      useRecipeStore.setState(({ recipes }) => ({
        recipes: recipes.map((entry) => ({ ...entry, name: "Alfajores de maicena" })),
      })),
    );
    await waitFor(() =>
      expect(repository.snapshot().recipes[0].name).toBe("Alfajores de maicena"),
    );
    await waitFor(() => expect(useSaveStatusStore.getState().status).toBe("saved"));
  });

  it("reloads the data when coming back to the tab", async () => {
    renderGate(createFakeAuth(ANA));
    await screen.findByText("Alfajores");
    // Another device changed the data meanwhile.
    repository.seed({ recipes: [recipe("a", "Alfajores"), recipe("b", "Brownie")] });
    act(() => setVisibility("hidden"));
    act(() => setVisibility("visible"));
    expect(await screen.findByText("Brownie")).toBeInTheDocument();
    expect(repository.writes).toEqual([]);
  });

  it("explains a failed load and retries it", async () => {
    const load = vi.spyOn(repository, "load").mockRejectedValueOnce(new Error("offline"));
    const user = renderGate(createFakeAuth(ANA));
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(screen.getByText(/No pudimos cargar tus datos/)).toBeInTheDocument();
    await user.click(retry);
    expect(await screen.findByText("Alfajores")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("signs out, clearing the data from memory", async () => {
    const auth = createFakeAuth(ANA);
    const user = renderGate(auth);
    await screen.findByText("Alfajores");
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("button", { name: /Entrar con Google/ })).toBeInTheDocument();
    expect(useRecipeStore.getState().recipes).toEqual([]);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("says Supabase is not configured when there is no auth", () => {
    render(
      <AuthGate auth={null} repository={null}>
        <Probe />
      </AuthGate>,
    );
    expect(screen.getByText(/Falta configurar Supabase/)).toBeInTheDocument();
  });
});
