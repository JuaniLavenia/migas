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

  it("shows the business name and renames it in place", async () => {
    const renameBusiness = vi.fn();
    renderSidebar({
      user: { email: "ana@example.com" },
      businessName: "Migas de Ana",
      renameBusiness,
      signOut: () => {},
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cambiar el nombre: Migas de Ana" }));
    const input = screen.getByRole("textbox", { name: "Nombre del emprendimiento" });
    expect(input).toHaveValue("Migas de Ana");
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "  Dulce Miga  {Enter}");
    expect(renameBusiness).toHaveBeenCalledWith("Dulce Miga");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("keeps the business name when the edit is cancelled, blank or unchanged", async () => {
    const renameBusiness = vi.fn();
    renderSidebar({
      user: { email: "ana@example.com" },
      businessName: "Migas de Ana",
      renameBusiness,
      signOut: () => {},
    });
    const user = userEvent.setup();
    const edit = () => user.click(screen.getByRole("button", { name: /Cambiar el nombre/ }));
    const input = () => screen.getByRole("textbox", { name: "Nombre del emprendimiento" });
    await edit();
    await user.type(input(), " XL{Escape}");
    await edit();
    await user.clear(input());
    await user.type(input(), "   {Enter}");
    await edit();
    await user.type(input(), "{Enter}");
    expect(renameBusiness).not.toHaveBeenCalled();
    expect(screen.getByText("Migas de Ana")).toBeInTheDocument();
  });

  it("saves the business name when leaving the field", async () => {
    const renameBusiness = vi.fn();
    renderSidebar({
      user: { email: "ana@example.com" },
      businessName: "Mi emprendimiento",
      renameBusiness,
      signOut: () => {},
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cambiar el nombre/ }));
    await user.clear(screen.getByRole("textbox", { name: "Nombre del emprendimiento" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre del emprendimiento" }), "Dulce Miga");
    await user.tab();
    expect(renameBusiness).toHaveBeenCalledWith("Dulce Miga");
  });

  it("shows the default name, not editable, outside a session", () => {
    renderSidebar(null);
    expect(screen.getByText("Mi emprendimiento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cambiar el nombre/ })).toBeNull();
  });

  it("falls back to the email when the account has no name", () => {
    renderSidebar({ user: { email: "beto@example.com" }, signOut: () => {} });
    expect(screen.getAllByText("beto@example.com")).toHaveLength(1);
  });
});
