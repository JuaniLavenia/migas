import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import ModalShell from "../../shared/ModalShell";
import { currency } from "../../lib/format";
import { ORDER_STATUSES, orderTotals } from "../../lib/orders";

const byName = (a, b) => a.name.localeCompare(b.name, "es");

// Quantities and amounts stay strings while typing; blank counts as 0.
function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toLines(lines, key) {
  return lines
    .map((line) => ({ [key]: line[key], quantity: toNumber(line.quantity) }))
    .filter((line) => line.quantity > 0);
}

// The next line adds the first option not used yet (or the first one).
function nextLine(lines, options, key) {
  const used = new Set(lines.map((line) => line[key]));
  const option = options.find((entry) => !used.has(entry.id)) ?? options[0];
  return [...lines, { [key]: option.id, quantity: "1" }];
}

// One editable list of lines: products (recipe × units), packaging
// (item × quantity) or decoration (ingredient × amount in its unit, decimals
// allowed). A line whose recipe or item was deleted keeps it, shown as
// deleted, until she changes or removes it.
function OrderLines({
  title,
  lines,
  options,
  lineKey,
  labels,
  onChange,
  unitOf = () => "un",
  step = "1",
}) {
  const update = (index, field, value) =>
    onChange(lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)));
  return (
    <>
      <div className="modal-subheading">{title}</div>
      <div className="modal-ingredients">
        {lines.map((line, index) => {
          const number = index + 1;
          const option = options.find((entry) => entry.id === line[lineKey]);
          const known = Boolean(option);
          return (
            <div className="modal-ingredient-row" key={index}>
              <select
                aria-label={`${labels.item} ${number}`}
                value={line[lineKey]}
                onChange={(event) => update(index, lineKey, event.target.value)}
              >
                {!known && (
                  <option value={line[lineKey]} disabled>
                    {labels.deleted}
                  </option>
                )}
                {options.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <input
                aria-label={`${labels.quantity} ${number}`}
                type="number"
                min={step === "1" ? "1" : "0"}
                step={step}
                value={line.quantity}
                onChange={(event) => update(index, "quantity", event.target.value)}
              />
              <span>{unitOf(option)}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`${labels.remove} ${number}`}
                title="Quitar"
                onClick={() => onChange(lines.filter((_, at) => at !== index))}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="secondary-button"
          onClick={() => onChange(nextLine(lines, options, lineKey))}
          disabled={!options.length}
        >
          <Plus size={16} /> {labels.add}
        </button>
      </div>
    </>
  );
}

// A deleted ingredient (option undefined) shows no unit.
const ingredientUnit = (ingredient) => (ingredient ? ingredient.unit || "g" : "");

// Create or edit an order. A new order's agreed price follows the proposed
// price until she types her own; an existing order keeps the price agreed.
function OrderModal({ initial, catalog, onClose, onSave }) {
  const fieldId = useId();
  const editing = Boolean(initial.id);
  const custom = initial.customization;
  const [form, setForm] = useState({
    client: initial.client ?? "",
    contact: initial.contact ?? "",
    dueDate: initial.dueDate ?? "",
    dueTime: initial.dueTime ?? "",
    delivery: initial.delivery ?? "pickup",
    notes: initial.notes ?? "",
    items: (initial.items ?? []).map((line) => ({ ...line, quantity: String(line.quantity) })),
    packagingItems: (initial.packagingItems ?? []).map((line) => ({
      ...line,
      quantity: String(line.quantity),
    })),
    decorationItems: (custom?.items ?? []).map((line) => ({
      ...line,
      quantity: String(line.quantity),
    })),
    feeType: custom?.feeType ?? "percent",
    fee: custom?.fee ? String(custom.fee) : "",
    // null: follow the proposed price.
    price: editing ? String(initial.price ?? 0) : null,
    paid: editing ? String(initial.paid ?? 0) : "",
    status: initial.status ?? "pending",
    // A new order she already delivered: recorded for the history.
    alreadyDelivered: false,
  });
  // A name of only spaces passes "required"; it is checked on submit.
  const [clientError, setClientError] = useState(false);
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const recipes = [...catalog.recipes].sort(byName);
  const packaging = [...catalog.packaging].sort(byName);
  const ingredients = [...catalog.ingredients].sort(byName);

  // Without decoration nor fee the order is not customized.
  const decorationItems = toLines(form.decorationItems, "ingredientId");
  const fee = Math.max(toNumber(form.fee), 0);
  const customization =
    decorationItems.length || fee > 0
      ? { items: decorationItems, feeType: form.feeType, fee }
      : undefined;
  const lines = {
    items: toLines(form.items, "recipeId"),
    packagingItems: toLines(form.packagingItems, "packagingId"),
  };
  const proposedPrice = Math.round(
    orderTotals({ ...lines, customization, price: 0 }, catalog).proposed,
  );
  const followsProposed = form.price === null || form.price.trim() === "";
  const price = followsProposed ? proposedPrice : toNumber(form.price);
  const totals = orderTotals({ ...lines, customization, price }, catalog);
  // The cost-based price only adds information when a recipe sale price
  // moves "Tu precio" away from it.
  const showsCostPrice =
    Math.round(totals.suggested) !== Math.round(totals.proposed);

  function submit(event) {
    event.preventDefault();
    if (!form.client.trim()) {
      setClientError(true);
      document.getElementById(`${fieldId}-client`)?.focus();
      return;
    }
    onSave({
      client: form.client.trim(),
      contact: form.contact.trim(),
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      delivery: form.delivery,
      notes: form.notes.trim(),
      ...lines,
      // Editing clears a removed customization; a new order leaves it out.
      ...(customization || editing ? { customization } : {}),
      price,
      paid: Math.max(toNumber(form.paid), 0),
      ...(editing ? { status: form.status } : {}),
      ...(!editing && form.alreadyDelivered ? { status: "delivered" } : {}),
    });
  }

  return (
    <ModalShell
      title={editing ? "Editar pedido" : initial.repeatOf ? "Repetir pedido" : "Nuevo pedido"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor={`${fieldId}-client`}>Cliente</label>
            <input
              id={`${fieldId}-client`}
              required
              value={form.client}
              onChange={(event) => {
                change("client", event.target.value);
                setClientError(false);
              }}
              placeholder="Ej. Sofi"
              aria-invalid={clientError}
              aria-describedby={clientError ? `${fieldId}-client-error` : undefined}
            />
            {clientError && (
              <p className="field-error" id={`${fieldId}-client-error`}>
                Escribí el nombre del cliente.
              </p>
            )}
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-contact`}>Contacto</label>
            <input
              id={`${fieldId}-contact`}
              value={form.contact}
              onChange={(event) => change("contact", event.target.value)}
              placeholder="WhatsApp o Instagram"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-date`}>Fecha de entrega</label>
            <input
              id={`${fieldId}-date`}
              type="date"
              required
              value={form.dueDate}
              onChange={(event) => change("dueDate", event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-time`}>Hora</label>
            <input
              id={`${fieldId}-time`}
              type="time"
              value={form.dueTime}
              onChange={(event) => change("dueTime", event.target.value)}
            />
          </div>
          <fieldset className="field-group full order-delivery-field">
            <legend>Entrega</legend>
            {[
              { value: "pickup", label: "Retira" },
              { value: "delivery", label: "Envío" },
            ].map((option) => (
              <label key={option.value} className="radio-option">
                <input
                  type="radio"
                  name={`${fieldId}-delivery`}
                  value={option.value}
                  checked={form.delivery === option.value}
                  onChange={() => change("delivery", option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          {editing && (
            <div className="field-group full">
              <label htmlFor={`${fieldId}-status`}>Estado</label>
              <select
                id={`${fieldId}-status`}
                value={form.status}
                onChange={(event) => change("status", event.target.value)}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!editing && (
            <div className="field-group full">
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={form.alreadyDelivered}
                  onChange={(event) => change("alreadyDelivered", event.target.checked)}
                  aria-describedby={`${fieldId}-delivered-hint`}
                />
                Ya entregado
              </label>
              <p className="field-hint" id={`${fieldId}-delivered-hint`}>
                Para registrar un pedido que ya hiciste: queda como Entregado y no descuenta stock.
              </p>
            </div>
          )}
        </div>
        <OrderLines
          title="Productos"
          lines={form.items}
          options={recipes}
          lineKey="recipeId"
          labels={{
            item: "Producto",
            quantity: "Unidades de producto",
            remove: "Quitar producto",
            add: "Agregar producto",
            deleted: "Receta eliminada",
          }}
          onChange={(items) => change("items", items)}
        />
        <OrderLines
          title="Packaging"
          lines={form.packagingItems}
          options={packaging}
          lineKey="packagingId"
          labels={{
            item: "Packaging",
            quantity: "Cantidad de packaging",
            remove: "Quitar packaging",
            add: "Agregar packaging",
            deleted: "Packaging eliminado",
          }}
          onChange={(packagingItems) => change("packagingItems", packagingItems)}
        />
        <OrderLines
          title="Personalización"
          lines={form.decorationItems}
          options={ingredients}
          lineKey="ingredientId"
          labels={{
            item: "Insumo de decoración",
            quantity: "Cantidad de decoración",
            remove: "Quitar insumo de decoración",
            add: "Agregar insumo de decoración",
            deleted: "Insumo eliminado",
          }}
          unitOf={ingredientUnit}
          step="any"
          onChange={(decorationItems) => change("decorationItems", decorationItems)}
        />
        <div className="form-grid">
          <div className="field-group full">
            <label htmlFor={`${fieldId}-fee`}>Recargo por diseño</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-fee`}
                type="number"
                min="0"
                step="any"
                value={form.fee}
                onChange={(event) => change("fee", event.target.value)}
                placeholder="0"
                aria-describedby={`${fieldId}-fee-hint`}
              />
              <select
                aria-label="Tipo de recargo"
                value={form.feeType}
                onChange={(event) => change("feeType", event.target.value)}
              >
                <option value="percent">%</option>
                <option value="amount">ARS</option>
              </select>
            </div>
            <p className="field-hint" id={`${fieldId}-fee-hint`}>
              Tu trabajo en la temática. El % se calcula sobre los productos.
            </p>
          </div>
        </div>
        <div className="form-grid order-money">
          <div className="field-group full">
            <label htmlFor={`${fieldId}-notes`}>Notas</label>
            <textarea
              id={`${fieldId}-notes`}
              rows={2}
              value={form.notes}
              onChange={(event) => change("notes", event.target.value)}
              placeholder='Ej. "Que diga Feliz cumple Sofi", sin TACC'
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-price`}>Precio acordado</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-price`}
                type="number"
                min="0"
                step="any"
                value={form.price ?? String(proposedPrice)}
                onChange={(event) => change("price", event.target.value)}
                aria-describedby={`${fieldId}-price-hint`}
              />
              <span>ARS</span>
            </div>
            <p className="field-hint" id={`${fieldId}-price-hint`}>
              Vacío usa «Tu precio».
            </p>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-paid`}>Cobrado</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-paid`}
                type="number"
                min="0"
                step="any"
                value={form.paid}
                onChange={(event) => change("paid", event.target.value)}
                placeholder="0"
                aria-describedby={`${fieldId}-paid-hint`}
              />
              <span>ARS</span>
            </div>
            <p className="field-hint" id={`${fieldId}-paid-hint`}>
              La seña, o el total si ya te pagó.
            </p>
          </div>
        </div>
        <div className="order-summary">
          <div>
            <span>Tu precio</span>
            <strong>{currency.format(totals.proposed)}</strong>
          </div>
          {showsCostPrice && (
            <div>
              <span>Según costos</span>
              <strong>{currency.format(totals.suggested)}</strong>
            </div>
          )}
          {customization && (
            <div>
              <span>Personalización</span>
              <strong>{currency.format(totals.customization)}</strong>
            </div>
          )}
          <div>
            <span>Costo</span>
            <strong>{currency.format(totals.cost)}</strong>
          </div>
          <div>
            <span>Ganancia real</span>
            <strong>{currency.format(totals.profit)}</strong>
          </div>
        </div>
        {showsCostPrice && (
          <p className="field-hint">
            «Tu precio» usa el precio de venta de tus recetas; «Según costos» es
            el costo de los insumos más el margen de cada receta.
          </p>
        )}
        {totals.missingCount > 0 && (
          <p className="price-warning order-warning">
            Hay productos, packaging o insumos de decoración sin costo completo:
            el costo y la ganancia no los cuentan.
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar pedido
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default OrderModal;
