import { useId } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

// Labelled sort field <select> plus an asc/desc toggle. `options` is a list of
// { value, label, directional? }; the toggle is hidden for an option with
// `directional: false` (e.g. the custom order).
function SortControl({ options, sort, direction, onSortChange, onDirectionChange }) {
  const selectId = useId();
  const ascending = direction === "asc";
  const DirectionIcon = ascending ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  const directional =
    options.find((option) => option.value === sort)?.directional !== false;

  return (
    <div className="sort-control">
      <label htmlFor={selectId}>Ordenar por</label>
      <select
        id={selectId}
        value={sort}
        onChange={(event) => onSortChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {directional && (
        <button
          type="button"
          className="icon-button sort-direction"
          aria-label={ascending ? "Orden ascendente" : "Orden descendente"}
          title={ascending ? "Cambiar a descendente" : "Cambiar a ascendente"}
          onClick={() => onDirectionChange(ascending ? "desc" : "asc")}
        >
          <DirectionIcon size={16} />
        </button>
      )}
    </div>
  );
}

export default SortControl;
