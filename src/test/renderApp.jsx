import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";
import useRecipeStore from "../stores/useRecipeStore";
import useRecipeSelectionStore from "../stores/useRecipeSelectionStore";
import useSaveStatusStore from "../stores/useSaveStatusStore";
import useToastStore from "../stores/useToastStore";

// Captured at import time, before any test mutates the store: demo data plus
// the store actions.
const initialState = useRecipeStore.getState();

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="current-path">{pathname}</div>;
}

// Current router path of the app rendered by renderApp.
export function currentPath() {
  return screen.getByTestId("current-path").textContent;
}

// Renders the whole app at `route` from a clean slate: demo data (optionally
// overridden), empty localStorage and no transient UI state, so tests never
// leak state into each other.
export function renderApp({ state, route = "/" } = {}) {
  useRecipeStore.setState({ ...initialState, ...state }, true);
  window.localStorage.clear();
  useSaveStatusStore.setState({ status: "saved" });
  useToastStore.setState({ toast: null });
  useRecipeSelectionStore.setState({ lastRecipeId: null });
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { user, ...view };
}
