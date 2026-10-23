import { useEffect, useState } from "react";
import {
  draftAfterValueChange,
  draftOnBlur,
  formatNumber,
  parseDraft,
} from "../lib/numericDraft";

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}

// Number input that can be cleared and retyped. It shows a local string draft
// and calls onChange(number) only when the draft is a finite number >= min.
// An empty or invalid draft commits nothing; on blur it falls back to the last
// committed value. `step="any"` keeps fractional values valid for HTML5
// validation. With `allowEmpty`, clearing the field commits null (a value
// that can be left unset).
function NumericInput({
  value,
  onChange,
  min = 0,
  onBlur,
  allowEmpty = false,
  ...props
}) {
  const numericValue = toNumber(value);
  const [draft, setDraft] = useState(() => formatNumber(numericValue));

  useEffect(() => {
    setDraft((current) => draftAfterValueChange(current, numericValue));
  }, [numericValue]);

  function handleChange(event) {
    const nextDraft = event.target.value;
    setDraft(nextDraft);
    if (allowEmpty && nextDraft.trim() === "") {
      if (!Number.isNaN(numericValue)) onChange(null);
      return;
    }
    const parsed = parseDraft(nextDraft, min);
    if (parsed !== null && parsed !== numericValue) onChange(parsed);
  }

  function handleBlur(event) {
    setDraft((current) => draftOnBlur(current, numericValue, min));
    onBlur?.(event);
  }

  return (
    <input
      {...props}
      type="number"
      min={min}
      step="any"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export default NumericInput;
