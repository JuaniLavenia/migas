// The stock typed in a form: blank is 0 and it is never negative.
export function stockValue(value) {
  const stock = Number(value);
  return Number.isFinite(stock) && stock > 0 ? stock : 0;
}
