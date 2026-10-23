import { Utensils } from "lucide-react";

// Full-screen card shown instead of the app (loading, errors, setup).
function GateMessage({ title, children, action }) {
  return (
    <main className="gate-screen">
      <section className="panel gate-card" aria-labelledby="gate-title">
        <span className="brand-mark gate-mark" aria-hidden="true">
          <Utensils size={20} />
        </span>
        <h1 id="gate-title">{title}</h1>
        {children && <p>{children}</p>}
        {action && (
          <button type="button" className="primary-button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </section>
    </main>
  );
}

export default GateMessage;
