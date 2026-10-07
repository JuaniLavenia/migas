import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useReorderFocus } from "./SortableList";

// Drag handle plus "Subir"/"Bajar" buttons for one item of a SortableList.
// `onMove(delta)` moves it one position (-1 up, +1 down) in the full list.
// `stacked` puts "Subir"/"Bajar" one above the other, for narrow columns.
function ReorderControls({
  id,
  name,
  handleProps,
  stacked = false,
  canMoveUp,
  canMoveDown,
  onMove,
}) {
  const focus = useReorderFocus();
  const upKey = `${id}:up`;
  const downKey = `${id}:down`;

  function move(delta) {
    // Keep the keyboard focus on this item once it is re-rendered.
    if (delta < 0) focus?.request(upKey, downKey);
    else focus?.request(downKey, upKey);
    onMove(delta);
  }

  return (
    <div className={`reorder-controls ${stacked ? "stacked" : ""}`}>
      <button
        type="button"
        className="icon-button drag-handle"
        aria-label={`Reordenar ${name}`}
        title="Arrastrá para reordenar"
        {...handleProps}
      >
        <GripVertical size={15} />
      </button>
      <button
        type="button"
        ref={focus?.register(upKey)}
        className="icon-button"
        aria-label={`Subir ${name}`}
        title="Subir"
        disabled={!canMoveUp}
        onClick={() => move(-1)}
      >
        <ChevronUp size={15} />
      </button>
      <button
        type="button"
        ref={focus?.register(downKey)}
        className="icon-button"
        aria-label={`Bajar ${name}`}
        title="Bajar"
        disabled={!canMoveDown}
        onClick={() => move(1)}
      >
        <ChevronDown size={15} />
      </button>
    </div>
  );
}

export default ReorderControls;
