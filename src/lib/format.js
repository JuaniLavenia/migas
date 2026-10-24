export const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// "a", "a y b", "a, b y c".
export function joinParts(parts) {
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`
    : parts[0];
}

export const unitLabels = { g: "gramos", ml: "mililitros", un: "unidades" };
