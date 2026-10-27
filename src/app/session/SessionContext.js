import { createContext, useContext } from "react";

// The signed-in session, provided by AuthGate: { user, businessId,
// businessName, renameBusiness, repository, reload, signOut }. null outside the gate (e.g. in UI tests that
// render the app with demo data).
export const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}
