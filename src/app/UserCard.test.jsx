import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { SessionContext } from "./session/SessionContext";

function renderSidebar(session) {
  render(
    <MemoryRouter>
      <SessionContext.Provider value={session}>
        <Sidebar id="s" counts={{}} open={false} inert={false} onNavigate={() => {}} onClose={() => {}} />
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}

describe("Signed-in user in the sidebar", () => {
  it("shows who is signed in and signs out", async () => {
    const signOut = vi.fn();
    renderSidebar({
      user: { email: "ana@example.com", user_metadata: { full_name: "Ana Pérez" } },
      signOut,
    });
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("AP")).toBeInTheDocument();
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("falls back to the email when the account has no name", () => {
    renderSidebar({ user: { email: "beto@example.com" }, signOut: () => {} });
    expect(screen.getAllByText("beto@example.com")).toHaveLength(1);
  });
});
