// Mapping between the app's records and the Supabase rows (see
// supabase/migrations). Collections are named as in the store: "recipes",
// "ingredients", "recipeCategories", "packaging", "orders", "finishedGoods".
// Optional fields (of recipes, an order's stockMove and customization) are
// null in the database and absent in the app. Postgres numerics come back as
// strings.

export const TABLES = {
  recipes: "recipes",
  ingredients: "ingredients",
  recipeCategories: "recipe_categories",
  packaging: "packaging",
  orders: "orders",
  finishedGoods: "finished_goods",
};

export const COLLECTIONS = Object.keys(TABLES);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function optionalText(value) {
  return typeof value === "string" && value !== "" ? value : null;
}

const mappers = {
  recipes: {
    toRow: (recipe) => ({
      name: recipe.name ?? "",
      category_id: optionalText(recipe.categoryId),
      yield: number(recipe.yield, 1),
      margin: number(recipe.margin),
      extras: number(recipe.extras),
      sale_price: optionalNumber(recipe.salePrice),
      image_url: optionalText(recipe.imageUrl),
      items: Array.isArray(recipe.items) ? recipe.items : [],
      updated_at: number(recipe.updatedAt, Date.now()),
    }),
    fromRow: (row) => {
      const salePrice = optionalNumber(row.sale_price);
      return {
        id: row.id,
        name: row.name,
        ...(row.category_id ? { categoryId: row.category_id } : {}),
        yield: number(row.yield, 1),
        margin: number(row.margin),
        extras: number(row.extras),
        ...(salePrice === null ? {} : { salePrice }),
        ...(row.image_url ? { imageUrl: row.image_url } : {}),
        updatedAt: number(row.updated_at),
        items: Array.isArray(row.items) ? row.items : [],
      };
    },
  },
  ingredients: {
    toRow: (ingredient) => ({
      name: ingredient.name ?? "",
      category: ingredient.category ?? "",
      unit: ingredient.unit ?? "g",
      pack_size: number(ingredient.packSize),
      pack_cost: number(ingredient.packCost),
      stock: number(ingredient.stock),
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      packSize: number(row.pack_size),
      packCost: number(row.pack_cost),
      stock: number(row.stock),
    }),
  },
  recipeCategories: {
    toRow: (category) => ({ name: category.name ?? "" }),
    fromRow: (row) => ({ id: row.id, name: row.name }),
  },
  packaging: {
    toRow: (item) => ({
      name: item.name ?? "",
      pack_size: number(item.packSize),
      pack_cost: number(item.packCost),
      stock: number(item.stock),
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name,
      packSize: number(row.pack_size),
      packCost: number(row.pack_cost),
      stock: number(row.stock),
    }),
  },
  orders: {
    toRow: (order) => ({
      client: order.client ?? "",
      contact: text(order.contact),
      due_date: order.dueDate,
      due_time: text(order.dueTime),
      delivery: text(order.delivery, "pickup"),
      notes: text(order.notes),
      items: list(order.items),
      packaging_items: list(order.packagingItems),
      price: number(order.price),
      paid: number(order.paid),
      status: text(order.status, "pending"),
      created_at: number(order.createdAt, Date.now()),
      stock_move: order.stockMove ?? null,
      customization: order.customization ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      client: row.client,
      contact: text(row.contact),
      dueDate: row.due_date,
      dueTime: text(row.due_time),
      delivery: text(row.delivery, "pickup"),
      notes: text(row.notes),
      items: list(row.items),
      packagingItems: list(row.packaging_items),
      price: number(row.price),
      paid: number(row.paid),
      status: text(row.status, "pending"),
      createdAt: number(row.created_at),
      ...(row.stock_move ? { stockMove: row.stock_move } : {}),
      ...(row.customization ? { customization: row.customization } : {}),
    }),
  },
  finishedGoods: {
    toRow: (lot) => ({
      recipe_id: lot.recipeId,
      quantity: number(lot.quantity),
      made_at: lot.madeAt,
    }),
    fromRow: (row) => ({
      id: row.id,
      recipeId: row.recipe_id,
      quantity: number(row.quantity),
      madeAt: row.made_at,
    }),
  },
};

// `position` is the record's index in the store's array (the custom order).
export function toRow(collection, record, businessId, position) {
  return {
    business_id: businessId,
    id: record.id,
    ...mappers[collection].toRow(record),
    position,
  };
}

export function fromRow(collection, row) {
  return mappers[collection].fromRow(row);
}
