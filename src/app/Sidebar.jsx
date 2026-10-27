import { forwardRef, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, Pencil, Utensils, X } from "lucide-react";
import { useSession } from "./session/SessionContext";
import { views } from "./navigation";

function NavItem({ view, count, onNavigate }) {
  const Icon = view.icon;
  return (
    <NavLink
      to={view.path}
      end={view.path === "/"}
      className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
      onClick={onNavigate}
    >
      <Icon size={18} /> {view.label} {count !== undefined && <span>{count}</span>}
    </NavLink>
  );
}

function initials(name) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const DEFAULT_BUSINESS_NAME = "Mi emprendimiento";

// The business name, renamed in place: Enter or leaving the field saves,
// Escape cancels; a blank or unchanged name is not saved. Outside a session
// it is the default name, not editable.
function BusinessName() {
  const session = useSession();
  const [draft, setDraft] = useState(null);
  // The edit already ended (saved or cancelled): the blur that follows is
  // ignored.
  const closedRef = useRef(false);
  const name = session?.businessName || DEFAULT_BUSINESS_NAME;
  if (!session?.renameBusiness) {
    return <div className="workspace-label">{DEFAULT_BUSINESS_NAME}</div>;
  }

  function start() {
    closedRef.current = false;
    setDraft(name);
  }
  function close(save) {
    if (closedRef.current) return;
    closedRef.current = true;
    const next = draft.trim();
    setDraft(null);
    if (save && next && next !== name) session.renameBusiness(next);
  }

  if (draft !== null) {
    return (
      <input
        className="workspace-input"
        aria-label="Nombre del emprendimiento"
        value={draft}
        maxLength={60}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => close(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") close(true);
          if (event.key === "Escape") close(false);
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="workspace-label workspace-button"
      aria-label={`Cambiar el nombre: ${name}`}
      title="Cambiar el nombre"
      onClick={start}
    >
      <span>{name}</span>
      <Pencil size={13} aria-hidden="true" />
    </button>
  );
}

// Who is signed in, with the sign-out button. Hidden outside a session.
function UserCard() {
  const session = useSession();
  if (!session) return null;
  const { user, signOut } = session;
  const name = user.user_metadata?.full_name || user.email || "Tu cuenta";
  return (
    <div className="user-card">
      <div className="avatar" aria-hidden="true">
        {initials(name)}
      </div>
      <div className="user-card-text">
        <strong>{name}</strong>
        {user.email && user.email !== name && <small>{user.email}</small>}
      </div>
      <button
        type="button"
        className="icon-button sidebar-icon-button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={signOut}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

// `counts` maps a view id to the badge shown next to it. NavLink marks the
// current view (class + aria-current). `inert` takes the closed mobile drawer
// out of the tab order and the accessibility tree.
const Sidebar = forwardRef(function Sidebar(
  { id, counts, open, inert, onNavigate, onClose },
  ref,
) {
  const renderItem = (view) => (
    <NavItem
      key={view.id}
      view={view}
      count={counts[view.id]}
      onNavigate={onNavigate}
    />
  );
  return (
    <aside
      id={id}
      ref={ref}
      className={`sidebar ${open ? "sidebar-open" : ""}`}
      // React 18 only passes `inert` through as a string attribute.
      inert={inert ? "" : undefined}
    >
      <div className="brand">
        <span className="brand-mark">
          <Utensils size={18} />
        </span>
        <span>Miga</span>
        <button
          type="button"
          className="icon-button mobile-close"
          aria-label="Cerrar menú"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <BusinessName />
      <nav className="nav-list">
        {views.filter((view) => view.main).map(renderItem)}
      </nav>
      <div className="sidebar-bottom">
        {views.filter((view) => !view.main).map(renderItem)}
        <UserCard />
      </div>
    </aside>
  );
});

export default Sidebar;
