const mysql = require("mysql2/promise");
const { products, devices, orders } = require("./data");

let primaryPool;
const TEMP_INVENTORY_BASELINE = 10;

function parseList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  try {
    if (typeof value === "string") {
      return JSON.parse(value || "[]");
    }

    return JSON.parse(String(value));
  } catch (_error) {
    return [];
  }
}

function toDbList(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function mapProduct(row) {
  const stockQty = Number(row.stock_qty || 0);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    rating: Number(row.rating),
    image: row.image,
    description: row.description,
    stockQty,
    inStock: stockQty > 0 && Boolean(row.in_stock),
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
    order_items: parseList(row.order_items),
    user_id: row.user_id,
    payment_status: row.payment_status,
  };
}

function mapUser(row) {
  return {
    id: row.id,
    phone: row.phone,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    email: row.email || "",
    mobileNumber: row.mobile_number || row.phone || "",
    addressLine1: row.address_line1 || "",
    addressLine2: row.address_line2 || "",
    addressLine3: row.address_line3 || "",
    country: row.country || "",
    stateName: row.state_name || "",
    city: row.city || "",
    pinCode: row.pin_code || "",
    profileCompleted: Boolean(row.profile_completed),
  };
}

function mapService(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category_slug || "gardener-visit",
    durationMinutes: Number(row.duration_minutes || 60),
    image: row.image || "🧑‍🌾",
    price: Number(row.price),
    isActive: Boolean(row.is_active),
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

async function queryPrimary(sql, params = []) {
  const [rows] = await primaryPool.query(sql, params);
  return rows;
}

async function querySecondary(sql, params = []) {
  const [rows] = await primaryPool.query(sql, params);
  return rows;
}

async function columnExists(tableName, columnName) {
  const rows = await queryPrimary(
    `SELECT COUNT(1) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName]
  );

  return Number(rows?.[0]?.count || 0) > 0;
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
      in_stock TINYINT(1) NOT NULL DEFAULT 1,
      stock_qty INT NOT NULL DEFAULT 10
    )
  `);

  if (!(await columnExists("products", "stock_qty"))) {
    await queryPrimary("ALTER TABLE products ADD COLUMN stock_qty INT NOT NULL DEFAULT 10");
  }

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
      order_items JSON NULL,
      user_id VARCHAR(64) NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await columnExists("orders", "order_items"))) {
    await queryPrimary("ALTER TABLE orders ADD COLUMN order_items JSON NULL");
  }

  if (!(await columnExists("orders", "user_id"))) {
    await queryPrimary("ALTER TABLE orders ADD COLUMN user_id VARCHAR(64) NULL");
  }

  if (!(await columnExists("orders", "payment_status"))) {
    await queryPrimary("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(32) NOT NULL DEFAULT 'paid'");
  }

  await queryPrimary(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(32) UNIQUE NOT NULL,
      first_name VARCHAR(120) NULL,
      last_name VARCHAR(120) NULL,
      mobile_number VARCHAR(32) NULL,
      email VARCHAR(180) NULL,
      address_line1 VARCHAR(255) NULL,
      address_line2 VARCHAR(255) NULL,
      address_line3 VARCHAR(255) NULL,
      country VARCHAR(80) NULL,
      state_name VARCHAR(80) NULL,
      city VARCHAR(80) NULL,
      pin_code VARCHAR(20) NULL,
      profile_completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await queryPrimary(`
    CREATE TABLE IF NOT EXISTS services (
      id INT PRIMARY KEY AUTO_INCREMENT,
      code VARCHAR(64) UNIQUE NOT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT,
      category_slug VARCHAR(120) NOT NULL DEFAULT 'gardener-visit',
      duration_minutes INT NOT NULL DEFAULT 60,
      image VARCHAR(24) NULL,
      price DECIMAL(10, 2) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await columnExists("services", "category_slug"))) {
    await queryPrimary("ALTER TABLE services ADD COLUMN category_slug VARCHAR(120) NOT NULL DEFAULT 'gardener-visit'");
  }

  if (!(await columnExists("services", "duration_minutes"))) {
    await queryPrimary("ALTER TABLE services ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60");
  }

  if (!(await columnExists("services", "image"))) {
    await queryPrimary("ALTER TABLE services ADD COLUMN image VARCHAR(24) NULL");
  }
}

async function seedIfEmpty() {
  const productCountRows = await queryPrimary("SELECT COUNT(1) AS count FROM products");
  if (productCountRows[0].count === 0) {
    for (const item of products) {
      await queryPrimary(
        `INSERT INTO products (id, name, category, price, rating, image, description, in_stock, stock_qty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.price,
          item.rating,
          item.image,
          item.description,
          item.inStock ? 1 : 0,
          item.stockQty || TEMP_INVENTORY_BASELINE,
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
        `INSERT INTO orders (id, date, status, items, total, items_list, order_items, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.date,
          item.status,
          item.items,
          item.total,
          toDbList(item.items_list),
          toDbList(item.order_items || []),
          "paid",
        ]
      );
    }
  }

  const serviceCountRows = await queryPrimary("SELECT COUNT(1) AS count FROM services");
  if (serviceCountRows[0].count === 0) {
    await queryPrimary(
      `INSERT INTO services (code, title, description, category_slug, duration_minutes, image, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "svc_balcony", "Balcony Garden Care", "Monthly maintenance for balcony plants", "gardener-visit", 45, "🪴", 499, 1,
        "svc_villa", "Villa / Lawn Maintenance", "Comprehensive care for villa gardens and lawns", "gardener-visit", 90, "🏡", 899, 1,
        "svc_plant_doctor", "Plant Doctor Visit", "One-time expert diagnosis and treatment", "plant-doctor", 60, "🩺", 699, 1,
      ]
    );
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

async function listOrdersFromPrimary(userId) {
  const rows = userId
    ? await queryPrimary("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId])
    : await queryPrimary("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(mapOrder);
}

async function getOrderByIdFromPrimary(id, userId) {
  const rows = userId
    ? await queryPrimary("SELECT * FROM orders WHERE id = ? AND user_id = ?", [id, userId])
    : await queryPrimary("SELECT * FROM orders WHERE id = ?", [id]);
  return rows.length ? mapOrder(rows[0]) : null;
}

async function getNextOrderNumber() {
  const rows = await queryPrimary(
    `SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS max_num
     FROM orders
     WHERE id REGEXP '^ORD[0-9]+$'`
  );

  const maxNum = Number(rows?.[0]?.max_num || 0);
  return maxNum + 1;
}

async function getProductStockById(id, connection) {
  const db = connection || primaryPool;
  const [rows] = await db.query("SELECT id, stock_qty, in_stock, name, price FROM products WHERE id = ?", [id]);
  return rows.length ? rows[0] : null;
}

async function decrementProductStock(id, quantity, connection) {
  const db = connection || primaryPool;
  const [result] = await db.query(
    `UPDATE products
     SET stock_qty = stock_qty - ?, in_stock = IF((stock_qty - ?) > 0, 1, 0)
     WHERE id = ? AND stock_qty >= ?`,
    [quantity, quantity, id, quantity]
  );
  return result.affectedRows > 0;
}

async function createOrderInPrimary(order, connection) {
  const db = connection || primaryPool;
  await db.query(
    `INSERT INTO orders (id, date, status, items, total, items_list, order_items, user_id, payment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.id,
      order.date,
      order.status,
      order.items,
      order.total,
      toDbList(order.items_list),
      toDbList(order.order_items || []),
      order.user_id || null,
      order.payment_status || "paid",
    ]
  );
  return order;
}

async function findOrCreateUserByPhone(phone) {
  const rows = await queryPrimary("SELECT * FROM users WHERE phone = ?", [phone]);
  if (rows.length) {
    return mapUser(rows[0]);
  }

  const userId = `user-${String(phone).trim()}`;
  await queryPrimary("INSERT INTO users (id, phone, mobile_number) VALUES (?, ?, ?)", [
    userId,
    String(phone).trim(),
    String(phone).trim(),
  ]);

  const createdRows = await queryPrimary("SELECT * FROM users WHERE id = ?", [userId]);
  return mapUser(createdRows[0]);
}

async function getUserById(id) {
  const rows = await queryPrimary("SELECT * FROM users WHERE id = ?", [id]);
  return rows.length ? mapUser(rows[0]) : null;
}

function isProfileComplete(payload) {
  const requiredFields = [
    "firstName",
    "lastName",
    "mobileNumber",
    "email",
    "addressLine1",
    "country",
    "stateName",
    "city",
    "pinCode",
  ];

  return requiredFields.every((field) => String(payload[field] || "").trim().length > 0);
}

async function updateUserProfile(userId, profile) {
  const existing = await getUserById(userId);
  if (!existing) {
    return null;
  }

  const merged = {
    ...existing,
    ...profile,
    firstName: String(profile.firstName || existing.firstName || "").trim(),
    lastName: String(profile.lastName || existing.lastName || "").trim(),
    mobileNumber: String(profile.mobileNumber || existing.mobileNumber || "").trim(),
    email: String(profile.email || existing.email || "").trim(),
    addressLine1: String(profile.addressLine1 || existing.addressLine1 || "").trim(),
    addressLine2: String(profile.addressLine2 || existing.addressLine2 || "").trim(),
    addressLine3: String(profile.addressLine3 || existing.addressLine3 || "").trim(),
    country: String(profile.country || existing.country || "").trim(),
    stateName: String(profile.stateName || existing.stateName || "").trim(),
    city: String(profile.city || existing.city || "").trim(),
    pinCode: String(profile.pinCode || existing.pinCode || "").trim(),
  };

  const profileCompleted = isProfileComplete(merged) ? 1 : 0;

  await queryPrimary(
    `UPDATE users
     SET first_name = ?, last_name = ?, mobile_number = ?, email = ?,
         address_line1 = ?, address_line2 = ?, address_line3 = ?,
         country = ?, state_name = ?, city = ?, pin_code = ?, profile_completed = ?
     WHERE id = ?`,
    [
      merged.firstName,
      merged.lastName,
      merged.mobileNumber,
      merged.email,
      merged.addressLine1,
      merged.addressLine2,
      merged.addressLine3,
      merged.country,
      merged.stateName,
      merged.city,
      merged.pinCode,
      profileCompleted,
      userId,
    ]
  );

  const rows = await queryPrimary("SELECT * FROM users WHERE id = ?", [userId]);
  return rows.length ? mapUser(rows[0]) : null;
}

async function listServices() {
  const rows = await querySecondary("SELECT * FROM services WHERE is_active = 1 ORDER BY id ASC");
  return rows.map(mapService);
}

async function getServiceById(id) {
  const rows = await querySecondary("SELECT * FROM services WHERE id = ? AND is_active = 1", [id]);
  return rows.length ? mapService(rows[0]) : null;
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
  getProductStockById,
  decrementProductStock,
  createOrderInPrimary,
  withPrimaryTransaction,
  checkPrimaryHealth,
  checkSecondaryHealth,
  findOrCreateUserByPhone,
  getUserById,
  updateUserProfile,
  listServices,
  getServiceById,
};