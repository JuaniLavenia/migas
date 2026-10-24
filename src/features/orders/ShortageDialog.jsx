import { useId, useState } from "react";
import ModalShell from "../../shared/ModalShell";
import { joinParts } from "../../lib/format";

// "100 g de Manteca", "1 Box x8" (packaging is counted in units).
function missingLabel(entry) {
  return entry.kind === "packaging"
    ? `${entry.missing} ${entry.name}`
    : `${entry.missing} ${entry.unit} de ${entry.name}`;
}

// Shown when a status change cannot deduct the stock. With `shortages`, she
// can correct what she has right there (she may have forgotten to load a
// purchase) and try again; `onRetry` receives { kind, id, stock } updates.
// With `problems` (deleted recipes or packaging) the order must be edited.
function ShortageDialog({ shortages, problems, onRetry, onClose }) {
  const fieldId = useId();
  const [stocks, setStocks] = useState(() =>
    Object.fromEntries(shortages.map((entry) => [entry.id, String(entry.have)])),
  );
  if (problems.length) {
    return (
      <ModalShell title="No se puede preparar" onClose={onClose}>
        <p className="modal-text">
          Este pedido tiene productos o packaging que ya no existen. Editalo antes
          de prepararlo.
        </p>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Entendido
          </button>
        </div>
      </ModalShell>
    );
  }
  return (
    <ModalShell title="No alcanza el stock" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRetry(
            shortages.map((entry) => ({
              kind: entry.kind,
              id: entry.id,
              stock: stocks[entry.id],
            })),
          );
        }}
      >
        <p className="modal-text">
          Faltan {joinParts(shortages.map(missingLabel))}. Si ya lo compraste,
          actualizá lo que tenés y probá de nuevo.
        </p>
        <div className="form-grid">
          {shortages.map((entry, index) => (
            <div className="field-group" key={entry.id}>
              <label htmlFor={`${fieldId}-${index}`}>Tengo de {entry.name}</label>
              <div className="input-with-suffix">
                <input
                  id={`${fieldId}-${index}`}
                  type="number"
                  min="0"
                  step="any"
                  value={stocks[entry.id]}
                  onChange={(event) =>
                    setStocks((current) => ({ ...current, [entry.id]: event.target.value }))
                  }
                  aria-describedby={`${fieldId}-${index}-hint`}
                />
                <span>{entry.unit}</span>
              </div>
              <p className="field-hint" id={`${fieldId}-${index}-hint`}>
                Necesitás {entry.need} {entry.unit}
              </p>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Actualizar y reintentar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ShortageDialog;
