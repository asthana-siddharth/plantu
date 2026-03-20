const mysql = require("mysql2/promise");
const { products, devices, orders } = require("./data");

let primaryPool;

function parseList(value) {
  try {
    return JSON.parse(value || "[]");
  } catch (_error) {
    return [];
  }
}

function toDbList(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    rating: Number(row.rating),
    image: row.image,
    description: row.description,
    inStock: Boolean(row.in_stock),
  };
}

function mapDevice(row) {
  return {
    id: row.id,
    name: row.name,
    isOn: Boolean(row.is_on),
    moisture: row.moisture == null ? null : Number(row.moisture),
    lastSeen: row.last_seen,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    date: row.date,
    status: row.status,
    items: row.items,
    total: Number(row.total),
    items_list: parseList(row.items_list),
  };
}

function getPrimaryConfig() {
  return {
    host: process.env.DB_PRIMARY_HOST || "127.0.0.1",
    port: Number(process.env.DB_PRIMARY_PORT || 3306),
    user: process.env.DB_PRIMARY_USER || "root",
    password: process.env.DB_PRIMARY_PASSWORD || "",
    database: process.env.DB_PRIMARY_NAME || "plantu_db",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_PRIMARY_POOL_SIZE || 10),
    queueLimit: 0,
  };
}

function getSecondaryConfig() {
  return {
    host: process.env.DB_SECONDARY_HOST || process.env.DB_PRIMARY_HOST || "127.0.0.1",
    port: Number(process.env.DB_SECONDARY_PORT || process.env.DB_PRIMARY_PORT || 3306),
    user: process.env.DB_SECONDARY_USER || process.env.DB_PRIMARY_USER || "root",
    password: process.env.DB_SECONDARY_PASSWORD || process.env.DB_PRIMARY_PASSWORD || "",
    database: process.env.DB_SECONDARY_NAME || process.env.DB_PRIMARY_NAME || "plantu_db",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_SECONDARY_POOL_SIZE || 10),
    queueLimit: 0,
  };
}

async function queryPrimary(sql, params = []) {
  const [rows] = await primaryPool.query(sql, params);
  return rows;
}

async function querySecondary(sql, params = []) {
  const [rows] = await primaryPool.query(sql, params);
  return rows;
}

async function initializeSchema() {
  await queryPrimary(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(80) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      rating DECIMAL(3, 2) NOT NULL,
      image VARCHAR(80),
      description TEXT,
      in_stock TINYINT(1) NOT NULL DEFAULT 1
    )
  `);

  await queryPrimary(`
    CREATE TABLE IF NOT EXISTS devices (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      is_on TINYINT(1) NOT NULL DEFAULT 0,
      moisture DECIMAL(10, 2) NULL,
      last_seen BIGINT NULL
    )
  `);

  await queryPrimary(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(32) PRIMARY KEY,
      date VARCHAR(120) NOT NULL,
      status VARCHAR(64) NOT NULL,
      items INT NOT NULL,
      total DECIMAL(12, 2) NOT NULL,
      items_list JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedIfEmpty() {
  const productCountRows = await queryPrimary("SELECT COUNT(1) AS count FROM products");
  if (productCountRows[0].count === 0) {
    for (const item of products) {
      await queryPrimary(
        `INSERT INTO products (id, name, category, price, rating, image, description, in_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.price,
          item.rating,
          item.image,
          item.description,
          item.inStock ? 1 : 0,
        ]
      );
    }
  }

  const deviceCountRows = await queryPrimary("SELECT COUNT(1) AS count FROM devices");
  if (deviceCountRows[0].count === 0) {
    for (const item of devices) {
      await queryPrimary(
        `INSERT INTO devices (id, name, is_on, moisture, last_seen)
         VALUES (?, ?, ?, ?, ?)`,
        [item.id, item.name, item.isOn ? 1 : 0, item.moisture, item.lastSeen]
      );
    }
  }

  const orderCountRows = await queryPrimary("SELECT COUNT(1) AS count FROM orders");
  if (orderCountRows[0].count === 0) {
    for (const item of orders) {
      await queryPrimary(
        `INSERT INTO orders (id, date, status, items, total, items_list)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.date, item.status, item.items, item.total, toDbList(item.items_list)]
      );
    }
  }
}

async function initDb() {
  if (primaryPool) {
    return;
  }

  primaryPool = mysql.createPool(getPrimaryConfig());

  await primaryPool.query("SELECT 1");

  await initializeSchema();
  await seedIfEmpty();
}

async function listProducts({ category, search } = {}) {
  const clauses = [];
  const values = [];

  if (category && category !== "all") {
    clauses.push("category = ?");
    values.push(category);
  }

  if (search) {
    clauses.push("LOWER(name) LIKE ?");
    values.push(`%${String(search).toLowerCase()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await querySecondary(`SELECT * FROM products ${where} ORDER BY id ASC`, values);
  return rows.map(mapProduct);
}

async function getProductById(id) {
  const rows = await querySecondary("SELECT * FROM products WHERE id = ?", [id]);
  return rows.length ? mapProduct(rows[0]) : null;
}

async function listDevices() {
  const rows = await querySecondary("SELECT * FROM devices ORDER BY id ASC");
  return rows.map(mapDevice);
}

async function updateDeviceState(id, isOn) {
  const result = await queryPrimary(
    "UPDATE devices SET is_on = ?, last_seen = ? WHERE id = ?",
    [isOn ? 1 : 0, Date.now(), id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const rows = await queryPrimary("SELECT * FROM devices WHERE id = ?", [id]);
  return rows.length ? mapDevice(rows[0]) : null;
}

async function patchDevice(id, patch) {
  const existingRows = await queryPrimary("SELECT * FROM devices WHERE id = ?", [id]);
  if (!existingRows.length) {
    return null;
  }

  const existing = existingRows[0];
  const name = patch.name ?? existing.name;
  const moisture = patch.moisture ?? existing.moisture;
  const isOn = typeof patch.isOn === "boolean" ? patch.isOn : Boolean(existing.is_on);

  await queryPrimary(
    "UPDATE devices SET name = ?, moisture = ?, is_on = ?, last_seen = ? WHERE id = ?",
    [name, moisture, isOn ? 1 : 0, Date.now(), id]
  );

  const rows = await queryPrimary("SELECT * FROM devices WHERE id = ?", [id]);
  return rows.length ? mapDevice(rows[0]) : null;
}

async function listOrdersFromPrimary() {
  const rows = await queryPrimary("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(mapOrder);
}

async function getOrderByIdFromPrimary(id) {
  const rows = await queryPrimary("SELECT * FROM orders WHERE id = ?", [id]);
  return rows.length ? mapOrder(rows[0]) : null;
}

async function getNextOrderNumber() {
  const rows = await queryPrimary("SELECT id FROM orders WHERE id LIKE 'ORD%' ORDER BY created_at DESC LIMIT 1");
  if (!rows.length) {
    return 1;
  }

  const latestId = rows[0].id || "ORD000";
  const numericPart = Number(String(latestId).replace("ORD", "")) || 0;
  return numericPart + 1;
}

async function createOrderInPrimary(order, connection) {
  const db = connection || primaryPool;
  await db.query(
    `INSERT INTO orders (id, date, status, items, total, items_list)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order.id, order.date, order.status, order.items, order.total, toDbList(order.items_list)]
  );
  return order;
}

async function withPrimaryTransaction(executor) {
  const connection = await primaryPool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await executor(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function checkPrimaryHealth() {
  try {
    const [rows] = await primaryPool.query("SELECT 1 AS ok");
    return { ok: Boolean(rows?.[0]?.ok) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function checkSecondaryHealth() {
  // POC mode uses one MySQL instance for both read and write paths.
  return checkPrimaryHealth();
}

module.exports = {
  initDb,
  listProducts,
  getProductById,
  listDevices,
  updateDeviceState,
  patchDevice,
  listOrdersFromPrimary,
  getOrderByIdFromPrimary,
  getNextOrderNumber,
  createOrderInPrimary,
  withPrimaryTransaction,
  checkPrimaryHealth,
  checkSecondaryHealth,
};
