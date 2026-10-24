// Automatic stock. Preparing an order uses the finished goods first (oldest
// batch first), cooks full batches for the rest and keeps the leftover as a
// new batch; the order stores that `move` so it can be undone exactly:
//
//   { ingredients: [{ ingredientId, quantity }], packaging: [{ packagingId,
//     quantity }], taken: [{ lotId, recipeId, quantity, madeAt }],
//     cooked: [{ recipeId, quantity }], created: [{ lotId, recipeId,
//     quantity, madeAt }] }
//
// `cooked` are the units of the order that came out of new batches. Every
// function here is pure: `data` is { recipes, ingredients, packaging,
// finishedGoods } and the results are new arrays where only the changed
// records are new objects (cloudSync saves those). Dates are "YYYY-MM-DD".

const BEFORE_PREPARATION = ["pending", "confirmed", "cancelled"];
const PREPARED = ["preparing", "ready", "delivered"];

// What a status change does to the stock: "deduct", "undo" (going back to
// Pendiente or Confirmado), "cancel" or "none". Orders that deducted nothing
// (`hasMove` false), such as the ones prepared before automatic stock, never
// return anything.
export function stockTransition(from, to, hasMove) {
  if (!hasMove) {
    return BEFORE_PREPARATION.includes(from) && PREPARED.includes(to)
      ? "deduct"
      : "none";
  }
  if (to === "pending" || to === "confirmed") return "undo";
  if (to === "cancelled") return "cancel";
  return "none";
}

// Adds the quantities of repeated ids, keeping their first-seen order.
function addUp(lines, key) {
  const totals = new Map();
  (lines ?? []).forEach((line) => {
    const quantity = Number(line.quantity) || 0;
    if (quantity > 0) totals.set(line[key], (totals.get(line[key]) ?? 0) + quantity);
  });
  return totals;
}

function add(map, id, quantity) {
  map.set(id, (map.get(id) ?? 0) + quantity);
}

// Full batches that cover `units`, and the ingredients they take.
function batchesFor(recipe, units) {
  const size = Math.max(Number(recipe.yield) || 1, 1);
  const count = Math.ceil(units / size);
  return { count, leftover: count * size - units };
}

function addBatchIngredients(needs, recipe, count, ingredientIds) {
  (recipe.items ?? []).forEach((item) => {
    // A deleted ingredient has no stock to take.
    if (ingredientIds.has(item.ingredientId)) {
      add(needs, item.ingredientId, count * (Number(item.quantity) || 0));
    }
  });
}

function shortageList(kind, needs, list, unitOf) {
  return [...needs].map(([id, need]) => {
    const item = list.find((entry) => entry.id === id);
    const have = Number(item.stock) || 0;
    return {
      kind,
      id,
      name: item.name,
      unit: unitOf(item),
      need,
      have,
      missing: Math.max(need - have, 0),
    };
  });
}

const ingredientUnit = (ingredient) => ingredient.unit || "g";
const packagingUnit = () => "un";

// Oldest batch first; same day keeps the stored order.
function oldestFirst(lots) {
  return lots
    .map((lot, index) => ({ lot, index }))
    .sort((a, b) => a.lot.madeAt.localeCompare(b.lot.madeAt) || a.index - b.index)
    .map(({ lot }) => lot);
}

// The move that preparing `order` takes, or what stops it: `shortages`
// (stock that is not enough, the move is not to be applied) and `problems`
// (lines whose recipe or packaging was deleted).
export function planPreparation(order, data, today, newId) {
  const ingredientIds = new Set(data.ingredients.map((item) => item.id));
  const ingredientNeeds = new Map();
  const taken = [];
  const cooked = [];
  const created = [];
  const problems = [];
  addUp(order.items, "recipeId").forEach((units, recipeId) => {
    const recipe = data.recipes.find((entry) => entry.id === recipeId);
    if (!recipe) {
      problems.push({ kind: "recipe", id: recipeId });
      return;
    }
    let remaining = units;
    oldestFirst(data.finishedGoods.filter((lot) => lot.recipeId === recipeId)).forEach(
      (lot) => {
        const quantity = Math.min(Number(lot.quantity) || 0, remaining);
        if (quantity <= 0) return;
        taken.push({ lotId: lot.id, recipeId, quantity, madeAt: lot.madeAt });
        remaining -= quantity;
      },
    );
    if (remaining <= 0) return;
    const { count, leftover } = batchesFor(recipe, remaining);
    addBatchIngredients(ingredientNeeds, recipe, count, ingredientIds);
    cooked.push({ recipeId, quantity: remaining });
    if (leftover > 0) {
      created.push({ lotId: newId(), recipeId, quantity: leftover, madeAt: today });
    }
  });
  const packagingNeeds = new Map();
  addUp(order.packagingItems, "packagingId").forEach((quantity, packagingId) => {
    if (data.packaging.some((item) => item.id === packagingId)) {
      packagingNeeds.set(packagingId, quantity);
    } else {
      problems.push({ kind: "packaging", id: packagingId });
    }
  });
  const shortages = [
    ...shortageList("ingredient", ingredientNeeds, data.ingredients, ingredientUnit),
    ...shortageList("packaging", packagingNeeds, data.packaging, packagingUnit),
  ].filter((entry) => entry.missing > 0);
  return {
    move: {
      ingredients: [...ingredientNeeds].map(([ingredientId, quantity]) => ({
        ingredientId,
        quantity,
      })),
      packaging: [...packagingNeeds].map(([packagingId, quantity]) => ({
        packagingId,
        quantity,
      })),
      taken,
      cooked,
      created,
    },
    shortages,
    problems,
  };
}

// Adds `sign` × each line's quantity to the stock of its item. A deleted item
// is skipped.
function shiftStock(list, lines, key, sign) {
  const deltas = addUp(lines, key);
  if (!deltas.size) return list;
  return list.map((item) =>
    deltas.has(item.id)
      ? { ...item, stock: (Number(item.stock) || 0) + sign * deltas.get(item.id) }
      : item,
  );
}

// Subtracts from batches by id; batches left at 0 are removed.
function takeFromLots(lots, lines) {
  const deltas = addUp(lines, "lotId");
  if (!deltas.size) return lots;
  return lots.flatMap((lot) => {
    if (!deltas.has(lot.id)) return [lot];
    const quantity = (Number(lot.quantity) || 0) - deltas.get(lot.id);
    return quantity > 0 ? [{ ...lot, quantity }] : [];
  });
}

// Gives back the units taken from each batch, bringing back the batches that
// were used up (same id and date).
function returnToLots(lots, taken) {
  let next = lots;
  taken.forEach(({ lotId, recipeId, quantity, madeAt }) => {
    const existing = next.find((lot) => lot.id === lotId);
    next = existing
      ? next.map((lot) =>
          lot.id === lotId ? { ...lot, quantity: (Number(lot.quantity) || 0) + quantity } : lot,
        )
      : [...next, { id: lotId, recipeId, quantity, madeAt }];
  });
  return next;
}

export function applyMove(data, move) {
  return {
    ingredients: shiftStock(data.ingredients, move.ingredients, "ingredientId", -1),
    packaging: shiftStock(data.packaging, move.packaging, "packagingId", -1),
    finishedGoods: [
      ...takeFromLots(data.finishedGoods, move.taken),
      ...move.created.map(({ lotId, recipeId, quantity, madeAt }) => ({
        id: lotId,
        recipeId,
        quantity,
        madeAt,
      })),
    ],
  };
}

// Cancelled after preparing: what was cooked stays as finished goods (the
// units it took keep their batch and date, the ones cooked for it are a new
// batch dated `today`), the packaging comes back and the ingredients do not.
export function cancelMove(data, move, today, newId) {
  return {
    ingredients: data.ingredients,
    packaging: shiftStock(data.packaging, move.packaging, "packagingId", 1),
    finishedGoods: [
      ...returnToLots(data.finishedGoods, move.taken),
      ...move.cooked.map(({ recipeId, quantity }) => ({
        id: newId(),
        recipeId,
        quantity,
        madeAt: today,
      })),
    ],
  };
}

// Going back: returns everything it deducted and removes the leftover it
// created. When part of that leftover was already used (by another order or
// by hand), the batches cannot be undone, so it ends like a cancellation.
export function undoMove(data, move, today, newId) {
  const intact = move.created.every((created) => {
    const lot = data.finishedGoods.find((entry) => entry.id === created.lotId);
    return lot && Number(lot.quantity) >= created.quantity;
  });
  if (!intact) return cancelMove(data, move, today, newId);
  return {
    ingredients: shiftStock(data.ingredients, move.ingredients, "ingredientId", 1),
    packaging: shiftStock(data.packaging, move.packaging, "packagingId", 1),
    finishedGoods: returnToLots(
      takeFromLots(data.finishedGoods, move.created),
      move.taken,
    ),
  };
}

// What the active orders not prepared yet (Pendiente and Confirmado) need:
// their units added up per recipe, minus all its finished goods, in full
// batches. `groups` are by ingredient category (blank: "Otros"), in
// `categoryOrder` when given, then the packaging; `missing` is 0 when she has
// enough.
export function shoppingList(data, categoryOrder = []) {
  const waiting = (data.orders ?? []).filter(
    (order) =>
      !order.stockMove && (order.status === "pending" || order.status === "confirmed"),
  );
  const units = addUp(waiting.flatMap((order) => order.items ?? []), "recipeId");
  const ingredientIds = new Set(data.ingredients.map((item) => item.id));
  const ingredientNeeds = new Map();
  const batches = [];
  units.forEach((ordered, recipeId) => {
    const recipe = data.recipes.find((entry) => entry.id === recipeId);
    if (!recipe) return;
    const ready = data.finishedGoods
      .filter((lot) => lot.recipeId === recipeId)
      .reduce((total, lot) => total + (Number(lot.quantity) || 0), 0);
    if (ordered <= ready) return;
    const { count } = batchesFor(recipe, ordered - ready);
    batches.push({ recipeId, name: recipe.name, count });
    addBatchIngredients(ingredientNeeds, recipe, count, ingredientIds);
  });
  const packagingNeeds = new Map();
  addUp(waiting.flatMap((order) => order.packagingItems ?? []), "packagingId").forEach(
    (quantity, id) => {
      if (data.packaging.some((item) => item.id === id)) packagingNeeds.set(id, quantity);
    },
  );

  const byName = (a, b) => a.name.localeCompare(b.name, "es");
  const categories = new Map();
  shortageList("ingredient", ingredientNeeds, data.ingredients, ingredientUnit).forEach(
    (entry) => {
      const ingredient = data.ingredients.find((item) => item.id === entry.id);
      const label = ingredient.category || "Otros";
      if (!categories.has(label)) categories.set(label, []);
      categories.get(label).push(entry);
    },
  );
  const rank = (label) => {
    const index = categoryOrder.indexOf(label);
    return index === -1 ? categoryOrder.length : index;
  };
  const groups = [...categories]
    .map(([label, items]) => ({ label, items: items.sort(byName) }))
    .sort((a, b) => rank(a.label) - rank(b.label));
  const packagingItems = shortageList("packaging", packagingNeeds, data.packaging, packagingUnit);
  if (packagingItems.length) {
    groups.push({ label: "Packaging", items: packagingItems.sort(byName) });
  }
  return { batches, groups };
}
