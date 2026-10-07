import { createContext, useContext, useEffect, useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const screenReaderInstructions = {
  draggable:
    "Para reordenar, presioná espacio o enter. Movelo con las flechas y presioná espacio o enter de nuevo para soltarlo; escape cancela.",
};

function announcements(getLabel) {
  const name = (id) => getLabel(id) ?? "el elemento";
  return {
    onDragStart: ({ active }) => `Moviendo ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${name(active.id)} está sobre la posición de ${name(over.id)}.`
        : `${name(active.id)} no está sobre ninguna posición.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${name(active.id)} quedó en la posición de ${name(over.id)}.`
        : `${name(active.id)} volvió a su lugar.`,
    onDragCancel: ({ active }) =>
      `Movimiento cancelado: ${name(active.id)} volvió a su lugar.`,
  };
}

// Lets the reorder buttons keep keyboard focus on the moved item after its
// row is re-rendered elsewhere (another position or another page).
const FocusContext = createContext(null);

// Drag-and-drop reordering of `ids` (the visible items, in order). Dragging
// uses a handle (see SortableItem) with the pointer (after a small move, so
// clicks still work) or the keyboard. `onReorder(activeId, overId)` is called
// when an item is dropped on another one's position.
export function SortableList({
  ids,
  getLabel,
  onReorder,
  strategy = verticalListSortingStrategy,
  children,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const buttons = useRef(new Map());
  const pendingFocus = useRef(null);

  // After every render: focus the button that asked for it, or its sibling
  // when it ended up disabled (moved to the first or last position). Moving
  // to another page takes an extra render (the URL changes after the store),
  // so a request waits a few renders for its button before it is dropped.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const own = buttons.current.get(pending.key);
    const fallback = buttons.current.get(pending.fallbackKey);
    const target = own && !own.disabled ? own : fallback;
    if (target) {
      target.focus();
      pendingFocus.current = null;
    } else {
      pending.rendersLeft -= 1;
      if (pending.rendersLeft <= 0) pendingFocus.current = null;
    }
  });

  const focus = {
    register: (key) => (node) => {
      if (node) buttons.current.set(key, node);
      else buttons.current.delete(key);
    },
    request: (key, fallbackKey) => {
      pendingFocus.current = { key, fallbackKey, rendersLeft: 3 };
    },
  };

  function handleDragEnd({ active, over }) {
    if (over && active.id !== over.id) onReorder(active.id, over.id);
  }

  return (
    <FocusContext.Provider value={focus}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: announcements(getLabel),
          screenReaderInstructions,
        }}
      >
        <SortableContext items={ids} strategy={strategy}>
          {children}
        </SortableContext>
      </DndContext>
    </FocusContext.Provider>
  );
}

// One sortable item. `children(handleProps)` renders its content; spread
// `handleProps` on the drag handle button.
export function SortableItem({ id, className = "", children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    attributes: { roleDescription: "elemento reordenable" },
  });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const handleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? "dragging" : ""}`}
    >
      {children(handleProps)}
    </div>
  );
}

export function useReorderFocus() {
  return useContext(FocusContext);
}
