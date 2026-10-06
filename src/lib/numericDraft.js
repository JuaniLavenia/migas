// Pure decisions behind NumericInput. The input keeps a string draft so the
// user can clear it and retype; only drafts that parse to a valid number are
// committed upward.

// Returns the draft as a finite number >= min, or null when it must not be
// committed (empty, not numeric, or below the minimum).
export function parseDraft(draft, min = -Infinity) {
  if (typeof draft !== "string" || draft.trim() === "") return null;
  const parsed = Number(draft);
  if (!Number.isFinite(parsed) || parsed < min) return null;
  return parsed;
}

export function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "";
}

// Called when the committed value changes. A draft that already represents
// the value is kept as typed (e.g. "1." while typing "1.5"); anything else is
// replaced so external changes are shown.
export function draftAfterValueChange(draft, value) {
  return parseDraft(draft) === value ? draft : formatNumber(value);
}

// On blur a valid draft is normalized and an invalid one (empty or below the
// minimum) falls back to the last committed value.
export function draftOnBlur(draft, value, min) {
  const parsed = parseDraft(draft, min);
  return parsed === null ? formatNumber(value) : formatNumber(parsed);
}
