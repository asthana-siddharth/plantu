const mysql = require("mysql2/promise");

let pool;

function getDbConfig() {
  return {
    host: process.env.DB_HOST || process.env.DB_PRIMARY_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || process.env.DB_PRIMARY_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_PRIMARY_USER || "root",
    password: process.env.DB_PASSWORD || process.env.DB_PRIMARY_PASSWORD || "",
    database: process.env.DB_NAME || process.env.DB_PRIMARY_NAME || "plantu_db",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
  };
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];

  try {
    if (typeof value === "string") {
      return JSON.parse(value || "[]");
    }
    return JSON.parse(String(value));
  } catch (_error) {
    return [];
  }
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COUNT(1) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName]
  );

  return Number(rows?.[0]?.count || 0) > 0;
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(32) UNIQUE,
      email VARCHAR(180),
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      contact_name VARCHAR(120),
      phone VARCHAR(32),
      email VARCHAR(180),
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      title VARCHAR(180) NOT NULL,
      discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(10,2) NOT NULL,
      min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      starts_at TIMESTAMP NULL,
      ends_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await columnExists("products", "stock_qty"))) {
    await query("ALTER TABLE products ADD COLUMN stock_qty INT NOT NULL DEFAULT 25");
  }

  if (!(await columnExists("products", "sku"))) {
    await query("ALTER TABLE products ADD COLUMN sku VARCHAR(64) NULL");
  }

  if (!(await columnExists("products", "vendor_id"))) {
    await query("ALTER TABLE products ADD COLUMN vendor_id INT NULL");
  }
}

async function seedAdminData() {
  const customersCount = await query("SELECT COUNT(1) AS count FROM customers");
  if (Number(customersCount[0].count) === 0) {
    await query(
      `INSERT INTO customers (name, phone, email, status)
       VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
      [
        "Siddharth Asthana", "9999999999", "sid@plantu.app", "active",
        "Anita Sharma", "9898989898", "anita@example.com", "active",
        "Rahul Verma", "9797979797", "rahul@example.com", "inactive",
      ]
    );
  }

  const vendorsCount = await query("SELECT COUNT(1) AS count FROM vendors");
  if (Number(vendorsCount[0].count) === 0) {
    await query(
      `INSERT INTO vendors (name, contact_name, phone, email, status)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [
        "GreenGrow Suppliers", "Maya", "8888888888", "maya@greengrow.com", "active",
        "Urban Pots Co", "Irfan", "8777777777", "sales@urbanpots.com", "active",
      ]
    );
  }

  const promoCount = await query("SELECT COUNT(1) AS count FROM promotions");
  if (Number(promoCount[0].count) === 0) {
    await query(
      `INSERT INTO promotions (code, title, discount_type, discount_value, min_order_value, is_active)
       VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        "WELCOME10", "Welcome Offer", "percent", 10, 299, 1,
        "FLAT100", "Flat 100 Off", "flat", 100, 999, 1,
      ]
    );
  }
}

async function initDb() {
  if (pool) return;
  pool = mysql.createPool(getDbConfig());
  await pool.query("SELECT 1");
  await initSchema();
  await seedAdminData();
}

async function checkDbHealth() {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return { ok: Boolean(rows?.[0]?.ok) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function listProducts() {
  return query("SELECT * FROM products ORDER BY id ASC");
}

async function createProduct(payload) {
  const result = await query(
    `INSERT INTO products (id, name, category, price, rating, image, description, in_stock, stock_qty, sku, vendor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.name,
      payload.category,
      payload.price,
      payload.rating,
      payload.image,
      payload.description,
      payload.inStock ? 1 : 0,
      payload.stockQty,
      payload.sku || null,
      payload.vendorId || null,
    ]
  );
  return { id: payload.id, affectedRows: result.affectedRows };
}

async function updateProduct(id, patch) {
  await query(
    `UPDATE products
     SET name = ?, category = ?, price = ?, rating = ?, image = ?, description = ?,
         in_stock = ?, stock_qty = ?, sku = ?, vendor_id = ?
     WHERE id = ?`,
    [
      patch.name,
      patch.category,
      patch.price,
      patch.rating,
      patch.image,
      patch.description,
      patch.inStock ? 1 : 0,
      patch.stockQty,
      patch.sku || null,
      patch.vendorId || null,
      id,
    ]
  );
  return query("SELECT * FROM products WHERE id = ?", [id]);
}

async function listInventory() {
  return query(
    `SELECT id, name, sku, stock_qty, in_stock,
            CASE WHEN stock_qty <= 5 THEN 'LOW' ELSE 'OK' END AS stock_status
     FROM products
     ORDER BY stock_qty ASC, id ASC`
  );
}

async function updateInventory(id, stockQty) {
  await query(
    "UPDATE products SET stock_qty = ?, in_stock = ? WHERE id = ?",
    [stockQty, stockQty > 0 ? 1 : 0, id]
  );
  return query("SELECT id, name, stock_qty, in_stock FROM products WHERE id = ?", [id]);
}

async function listCustomers() {
  return query("SELECT * FROM customers ORDER BY created_at DESC");
}

async function listOrders() {
  const rows = await query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map((row) => ({ ...row, items_list: parseList(row.items_list) }));
}

async function updateOrderStatus(id, status) {
  await query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  const rows = await query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!rows.length) return null;
  return { ...rows[0], items_list: parseList(rows[0].items_list) };
}

async function listVendors() {
  return query("SELECT * FROM vendors ORDER BY created_at DESC");
}

async function createVendor(payload) {
  const result = await query(
    `INSERT INTO vendors (name, contact_name, phone, email, status)
     VALUES (?, ?, ?, ?, ?)`,
    [payload.name, payload.contactName || null, payload.phone || null, payload.email || null, payload.status || "active"]
  );
  return query("SELECT * FROM vendors WHERE id = ?", [result.insertId]);
}

async function updateVendor(id, patch) {
  await query(
    "UPDATE vendors SET name = ?, contact_name = ?, phone = ?, email = ?, status = ? WHERE id = ?",
    [patch.name, patch.contactName || null, patch.phone || null, patch.email || null, patch.status || "active", id]
  );
  return query("SELECT * FROM vendors WHERE id = ?", [id]);
}

async function listPromotions() {
  return query("SELECT * FROM promotions ORDER BY created_at DESC");
}

async function createPromotion(payload) {
  const result = await query(
    `INSERT INTO promotions
      (code, title, discount_type, discount_value, min_order_value, is_active, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code,
      payload.title,
      payload.discountType || "percent",
      payload.discountValue,
      payload.minOrderValue || 0,
      payload.isActive ? 1 : 0,
      payload.startsAt || null,
      payload.endsAt || null,
    ]
  );
  return query("SELECT * FROM promotions WHERE id = ?", [result.insertId]);
}

async function updatePromotion(id, patch) {
  await query(
    `UPDATE promotions
     SET code = ?, title = ?, discount_type = ?, discount_value = ?,
         min_order_value = ?, is_active = ?, starts_at = ?, ends_at = ?
     WHERE id = ?`,
    [
      patch.code,
      patch.title,
      patch.discountType || "percent",
      patch.discountValue,
      patch.minOrderValue || 0,
      patch.isActive ? 1 : 0,
      patch.startsAt || null,
      patch.endsAt || null,
      id,
    ]
  );
  return query("SELECT * FROM promotions WHERE id = ?", [id]);
}

module.exports = {
  initDb,
  checkDbHealth,
  listProducts,
  createProduct,
  updateProduct,
  listInventory,
  updateInventory,
  listCustomers,
  listOrders,
  updateOrderStatus,
  listVendors,
  createVendor,
  updateVendor,
  listPromotions,
  createPromotion,
  updatePromotion,
};
