import { useId, useState } from "react";
import ModalShell from "../../shared/ModalShell";

// Packaging is counted in units: bought in packs of `packSize` units.
function PackagingModal({ initial, onClose, onSave }) {
  const fieldId = useId();
  const [form, setForm] = useState({
    name: initial.name || "",
    packSize: initial.packSize ?? "",
    packCost: initial.packCost ?? "",
    stock: initial.stock ?? (initial.id ? 0 : ""),
  });
  const change = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  return (
    <ModalShell
      title={initial.id ? "Editar packaging" : "Nuevo packaging"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label htmlFor={`${fieldId}-name`}>Nombre del packaging</label>
            <input
              id={`${fieldId}-name`}
              required
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              placeholder="Ej. Bolsa individual"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-pack-size`}>Presentación de compra</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-pack-size`}
                required
                type="number"
                min="0.01"
                step="any"
                value={form.packSize}
                onChange={(event) => change("packSize", event.target.value)}
                placeholder="100"
              />
              <span>un</span>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-pack-cost`}>Costo de la presentación</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-pack-cost`}
                required
                type="number"
                min="0"
                step="any"
                value={form.packCost}
                onChange={(event) => change("packCost", event.target.value)}
                placeholder="5000"
              />
              <span>ARS</span>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-stock`}>Tengo</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-stock`}
                type="number"
                min="0"
                step="any"
                value={form.stock}
                onChange={(event) => change("stock", event.target.value)}
                placeholder="0"
                aria-describedby={`${fieldId}-stock-hint`}
              />
              <span>un</span>
            </div>
            <p className="field-hint" id={`${fieldId}-stock-hint`}>
              Cuántas unidades te quedan.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar packaging
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default PackagingModal;
