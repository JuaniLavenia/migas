import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import useRecipeStore from "../stores/useRecipeStore";
import useSaveStatusStore from "../stores/useSaveStatusStore";
import useToastStore from "../stores/useToastStore";

// Captured at import time, before any test mutates the store: demo data plus
// the store actions.
const initialState = useRecipeStore.getState();

// Renders the whole app from a clean slate: demo data (optionally overridden)
// and empty localStorage, so tests never leak state into each other.
export function renderApp({ state } = {}) {
  useRecipeStore.setState({ ...initialState, ...state }, true);
  window.localStorage.clear();
  useSaveStatusStore.setState({ status: "saved" });
  useToastStore.setState({ toast: null });
  const user = userEvent.setup();
  const view = render(<App />);
  return { user, ...view };
}
