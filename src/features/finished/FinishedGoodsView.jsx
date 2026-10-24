import { Cookie, Edit3, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";

// `groups` are [{ id, name, total, lots }], lots oldest first; `ageOf(lot)`
// is "hoy", "ayer", "hace 3 días".
function FinishedGoodsView({ groups, ageOf, canAdd, onAdd, onEdit, onDiscard }) {
  return (
    <>
      <PageHeader
        eyebrow="Elaborados"
        title="Tus elaborados."
        description="Lo que ya tenés hecho. Los pedidos usan primero lo más viejo y lo que sobra de cada tanda vuelve acá."
        action={
          <button className="primary-button" onClick={onAdd} disabled={!canAdd}>
            <Plus size={18} /> Cargar elaborados
          </button>
        }
      />
      {groups.map((group) => (
        <section key={group.id} className="panel finished-group" aria-label={group.name}>
          <div className="finished-heading">
            <span className="ingredient-icon">
              <Cookie size={17} />
            </span>
            <h2>{group.name}</h2>
            <strong>{group.total} un</strong>
          </div>
          {group.lots.map((lot) => (
            <div className="finished-row" key={lot.id}>
              <span>Hecho {ageOf(lot)}</span>
              <strong>{lot.quantity} un</strong>
              <div className="row-actions">
                <button
                  className="icon-button"
                  title="Editar"
                  aria-label="Editar"
                  onClick={() => onEdit(lot)}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="icon-button danger"
                  title="Descartar"
                  aria-label="Descartar"
                  onClick={() => onDiscard(lot)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ))}
      {!groups.length && (
        <section className="panel">
          <div className="empty-state">
            <p>No tenés elaborados guardados.</p>
            <p className="field-hint">
              Cuando prepares un pedido, lo que sobre de la tanda aparece acá.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={onAdd}
              disabled={!canAdd}
            >
              <Plus size={16} /> Cargar los primeros elaborados
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default FinishedGoodsView;
