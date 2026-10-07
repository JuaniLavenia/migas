import { NavLink } from "react-router-dom";
import { ChevronRight, Utensils, X } from "lucide-react";
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

// `counts` maps a view id to the badge shown next to it. NavLink marks the
// current view (class + aria-current).
function Sidebar({ counts, open, onNavigate, onClose }) {
  const renderItem = (view) => (
    <NavItem
      key={view.id}
      view={view}
      count={counts[view.id]}
      onNavigate={onNavigate}
    />
  );
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
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
      <div className="workspace-label">
        Mi emprendimiento <ChevronRight size={13} />
      </div>
      <nav className="nav-list">
        {views.filter((view) => view.main).map(renderItem)}
      </nav>
      <div className="sidebar-bottom">
        {views.filter((view) => !view.main).map(renderItem)}
        <div className="user-card">
          <div className="avatar">MP</div>
          <div>
            <strong>Mi perfil</strong>
            <small>Emprendimiento</small>
          </div>
          <ChevronRight size={15} />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
