import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useSaveStatusStore from "../../stores/useSaveStatusStore";
import { createCloudSync } from "../../lib/data/cloudSync";
import { SessionContext } from "./SessionContext";
import LoginScreen from "./LoginScreen";
import GateMessage from "./GateMessage";

const emptyData = { ingredients: [], recipes: [], recipeCategories: [] };

// Shows the app only to a signed-in user. After sign-in it gets (or creates)
// the user's business, loads its data into the store and starts cloudSync;
// coming back to the tab saves anything pending and reloads, so changes
// from another device show up. `auth` and `repository` are ports
// (supabaseAuth.js, lib/data/repository.js); null means Supabase is not
// configured. `syncOptions` is passed to createCloudSync (tests).
function AuthGate({ auth, repository, syncOptions, children }) {
  // undefined: still checking the stored session.
  const [user, setUser] = useState(undefined);
  const [phase, setPhase] = useState("loading");
  const [businessId, setBusinessId] = useState(null);
  const syncRef = useRef(null);
  const userId = user?.id;

  useEffect(() => {
    if (!auth) return undefined;
    // Supabase must not be called from inside its own auth callback: only
    // keep the user here; loading reacts to the id below.
    return auth.onChange((session) => setUser(session?.user ?? null));
  }, [auth]);

  const stopSync = useCallback(() => {
    syncRef.current?.stop();
    syncRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setPhase("loading");
    try {
      const id = await repository.ensureBusiness();
      const data = await repository.load(id);
      stopSync();
      const sync = createCloudSync({
        store: useRecipeStore,
        repository,
        businessId: id,
        onStatus: (status) => useSaveStatusStore.setState({ status }),
        ...syncOptions,
      });
      sync.replaceData(data);
      syncRef.current = sync;
      setBusinessId(id);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [repository, stopSync, syncOptions]);

  useEffect(() => {
    if (!userId) return undefined;
    start();
    return stopSync;
  }, [userId, start, stopSync]);

  const reload = useCallback(async () => {
    const sync = syncRef.current;
    if (!sync || !businessId) return;
    await sync.flush();
    // Never replace data that changed while saving.
    if (sync.hasPending()) return;
    try {
      sync.replaceData(await repository.load(businessId));
    } catch {
      // Kept as is; the next return to the tab tries again.
    }
  }, [businessId, repository]);

  useEffect(() => {
    if (phase !== "ready") return undefined;
    function onVisibility() {
      if (document.visibilityState === "hidden") syncRef.current?.flush();
      else reload();
    }
    function onPageHide() {
      syncRef.current?.flush();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [phase, reload]);

  const signOut = useCallback(async () => {
    await syncRef.current?.flush();
    stopSync();
    useRecipeStore.setState(emptyData);
    setBusinessId(null);
    await auth.signOut();
  }, [auth, stopSync]);

  const session = useMemo(
    () => (user ? { user, businessId, repository, reload, signOut } : null),
    [user, businessId, repository, reload, signOut],
  );

  if (!auth || !repository) {
    return (
      <GateMessage title="Falta configurar Supabase">
        Definí VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (ver
        docs/supabase.md) y volvé a abrir la app.
      </GateMessage>
    );
  }
  if (user === undefined) return <GateMessage title="Cargando…" />;
  if (user === null) return <LoginScreen onSignIn={() => auth.signIn()} />;
  if (phase === "error") {
    return (
      <GateMessage
        title="No pudimos cargar tus datos"
        action={{ label: "Reintentar", onClick: start }}
      >
        Revisá la conexión a internet y probá de nuevo.
      </GateMessage>
    );
  }
  if (phase !== "ready") return <GateMessage title="Cargando tus recetas…" />;
  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

export default AuthGate;
