const mysql = require("mysql2/promise");
const crypto = require("crypto");

let pool;

const CATEGORY_HEADS = {
  ITEM: "item",
  SERVICE: "service",
};

const TAX_SCOPES = {
  ITEM_SGST: "item_sgst",
  ITEM_CGST: "item_cgst",
  SERVICE_SGST: "service_sgst",
  SERVICE_CGST: "service_cgst",
  PLATFORM_FEE: "platform_fee",
  TRANSPORTATION_FEE: "transportation_fee",
};

const CHARGE_TYPES = {
  PERCENT: "percent",
  FLAT: "flat",
};

const APPLIES_ON = {
  ALWAYS: "always",
  DELIVERY_ONLY: "delivery_only",
};

const ORDER_FLOW = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed"],
  Packed: ["Shipped"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

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

function hashPassword(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

  await query(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      permissions_json TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(128) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      role_id INT NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_admin_users_role FOREIGN KEY (role_id) REFERENCES admin_roles(id)
    )
  `);

  if (!(await columnExists("products", "stock_qty"))) {
    await query("ALTER TABLE products ADD COLUMN stock_qty INT NOT NULL DEFAULT 25");
  }

  if (!(await columnExists("products", "sku"))) {
    await query("ALTER TABLE products ADD COLUMN sku VARCHAR(64) NULL");
  }

  if (!(await columnExists("products", "vendor_id"))) {
    await query("ALTER TABLE products ADD COLUMN vendor_id VARCHAR(80) NULL");
  } else {
    await query("ALTER TABLE products MODIFY COLUMN vendor_id VARCHAR(80) NULL");
  }

  if (!(await columnExists("products", "onboarded_at"))) {
    await query("ALTER TABLE products ADD COLUMN onboarded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
  }

  // Older databases may not have this column but products APIs now select it.
  if (!(await columnExists("products", "created_at"))) {
    await query("ALTER TABLE products ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      head ENUM('item', 'service') NOT NULL DEFAULT 'item',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
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
    await query("ALTER TABLE services ADD COLUMN category_slug VARCHAR(120) NOT NULL DEFAULT 'gardener-visit'");
  }

  if (!(await columnExists("services", "duration_minutes"))) {
    await query("ALTER TABLE services ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60");
  }

  if (!(await columnExists("services", "image"))) {
    await query("ALTER TABLE services ADD COLUMN image VARCHAR(24) NULL");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS tax_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scope VARCHAR(64) NOT NULL UNIQUE,
      tax_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
      charge_type ENUM('percent', 'flat') NOT NULL DEFAULT 'percent',
      applies_on ENUM('always', 'delivery_only') NOT NULL DEFAULT 'always',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      description VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Existing deployments may still have ENUM('item','service'); widen for new scopes.
  await query("ALTER TABLE tax_rules MODIFY COLUMN scope VARCHAR(64) NOT NULL");

  if (!(await columnExists("tax_rules", "charge_type"))) {
    await query("ALTER TABLE tax_rules ADD COLUMN charge_type ENUM('percent', 'flat') NOT NULL DEFAULT 'percent'");
  }

  if (!(await columnExists("tax_rules", "applies_on"))) {
    await query("ALTER TABLE tax_rules ADD COLUMN applies_on ENUM('always', 'delivery_only') NOT NULL DEFAULT 'always'");
  }
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCategoryHead(head) {
  const normalized = String(head || "").trim().toLowerCase();
  if (normalized === CATEGORY_HEADS.ITEM || normalized === CATEGORY_HEADS.SERVICE) {
    return normalized;
  }
  return "";
}

function normalizeSearchTerm(value) {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : "";
}

function normalizeStatusValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.length ? normalized : "";
}

function normalizeBoolFilter(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["1", "true", "active", "yes"].includes(normalized)) {
    return 1;
  }
  if (["0", "false", "inactive", "no"].includes(normalized)) {
    return 0;
  }
  return null;
}

function normalizeTaxScope(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (Object.values(TAX_SCOPES).includes(normalized)) {
    return normalized;
  }
  return "";
}

function normalizeChargeType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === CHARGE_TYPES.PERCENT || normalized === CHARGE_TYPES.FLAT) {
    return normalized;
  }
  return "";
}

function normalizeAppliesOn(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === APPLIES_ON.ALWAYS || normalized === APPLIES_ON.DELIVERY_ONLY) {
    return normalized;
  }
  return "";
}

async function seedAdminData() {
  await query("DELETE FROM tax_rules WHERE scope IN ('item', 'service')");

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

  const roleCount = await query("SELECT COUNT(1) AS count FROM admin_roles");
  if (Number(roleCount[0].count) === 0) {
    await query(
      `INSERT INTO admin_roles (name, description, permissions_json, is_active)
       VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
      [
        "SuperAdmin",
        "Full system access",
        JSON.stringify(["*"]),
        1,
        "Operations",
        "Daily operations management",
        JSON.stringify(["products", "services", "inventory", "orders", "customers", "taxControl"]),
        1,
      ]
    );
  }

  const adminUserCount = await query("SELECT COUNT(1) AS count FROM admin_users");
  if (Number(adminUserCount[0].count) === 0) {
    const superAdminRole = await query("SELECT id FROM admin_roles WHERE name = ? LIMIT 1", ["SuperAdmin"]);
    if (superAdminRole.length) {
      await query(
        `INSERT INTO admin_users (username, password_hash, display_name, role_id, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ["admin", hashPassword("admin123"), "Primary Admin", Number(superAdminRole[0].id), 1]
      );
    }
  }

  const categoryCount = await query("SELECT COUNT(1) AS count FROM product_categories");
  if (Number(categoryCount[0].count) === 0) {
    await query(
      `INSERT INTO product_categories (name, slug, head, is_active)
       VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
      [
        "Plants", "plants", CATEGORY_HEADS.ITEM, 1,
        "Pots", "pots", CATEGORY_HEADS.ITEM, 1,
        "Seeds", "seeds", CATEGORY_HEADS.ITEM, 1,
        "Tools", "tools", CATEGORY_HEADS.ITEM, 1,
        "Planters", "planters", CATEGORY_HEADS.ITEM, 1,
        "Soil & Fertilizers", "soil-fertilizers", CATEGORY_HEADS.ITEM, 1,
        "Irrigation", "irrigation", CATEGORY_HEADS.ITEM, 1,
        "Gardener Visit", "gardener-visit", CATEGORY_HEADS.SERVICE, 1,
        "Plant Doctor", "plant-doctor", CATEGORY_HEADS.SERVICE, 1,
      ]
    );
  }

  const serviceCount = await query("SELECT COUNT(1) AS count FROM services");
  if (Number(serviceCount[0].count) === 0) {
    await query(
      `INSERT INTO services (code, title, description, category_slug, duration_minutes, image, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "svc_balcony", "Balcony Garden Care", "Monthly maintenance for balcony plants", "gardener-visit", 45, "🪴", 499, 1,
        "svc_villa", "Villa / Lawn Maintenance", "Comprehensive care for villa gardens and lawns", "gardener-visit", 90, "🏡", 899, 1,
        "svc_plant_doctor", "Plant Doctor Visit", "One-time expert diagnosis and treatment", "plant-doctor", 60, "🩺", 699, 1,
      ]
    );
  }

  const taxRuleCount = await query("SELECT COUNT(1) AS count FROM tax_rules");
  if (Number(taxRuleCount[0].count) === 0) {
    await query(
      `INSERT INTO tax_rules (scope, tax_percent, charge_type, applies_on, is_active, description)
       VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        TAX_SCOPES.ITEM_SGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "SGST on items",
        TAX_SCOPES.ITEM_CGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "CGST on items",
        TAX_SCOPES.SERVICE_SGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "SGST on services",
        TAX_SCOPES.SERVICE_CGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "CGST on services",
        TAX_SCOPES.PLATFORM_FEE, 20, CHARGE_TYPES.FLAT, APPLIES_ON.ALWAYS, 1, "Mandatory platform fee",
        TAX_SCOPES.TRANSPORTATION_FEE, 100, CHARGE_TYPES.FLAT, APPLIES_ON.DELIVERY_ONLY, 1, "Delivery fee (default)",
      ]
    );
  }

  await query(
    `INSERT INTO tax_rules (scope, tax_percent, charge_type, applies_on, is_active, description)
     VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tax_percent = tax_percent`,
    [
      TAX_SCOPES.ITEM_SGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "SGST on items",
      TAX_SCOPES.ITEM_CGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "CGST on items",
      TAX_SCOPES.SERVICE_SGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "SGST on services",
      TAX_SCOPES.SERVICE_CGST, 9, CHARGE_TYPES.PERCENT, APPLIES_ON.ALWAYS, 1, "CGST on services",
      TAX_SCOPES.PLATFORM_FEE, 20, CHARGE_TYPES.FLAT, APPLIES_ON.ALWAYS, 1, "Mandatory platform fee",
      TAX_SCOPES.TRANSPORTATION_FEE, 100, CHARGE_TYPES.FLAT, APPLIES_ON.DELIVERY_ONLY, 1, "Delivery fee (default)",
    ]
  );
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

async function listProducts({ search, category, isActive, page = 1, limit = 20 } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedCategory = toSlug(category);
  const normalizedIsActive = normalizeBoolFilter(isActive);
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = [10, 20, 50].includes(Number(limit)) ? Number(limit) : 20;

  if (normalizedSearch) {
    clauses.push("(CAST(id AS CHAR) LIKE ? OR LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(vendor_id, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like, like);
  }

  if (normalizedCategory) {
    clauses.push("category = ?");
    values.push(normalizedCategory);
  }

  if (normalizedIsActive !== null) {
    clauses.push("in_stock = ?");
    values.push(normalizedIsActive);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const totalRows = await query(`SELECT COUNT(1) AS count FROM products ${where}`, values);
  const total = Number(totalRows?.[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const offset = (safePage - 1) * safeLimit;

  const rows = await query(
    `SELECT id, name, category, price, image, description, in_stock, stock_qty, vendor_id, onboarded_at, created_at
     FROM products
     ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    rows,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

async function getProductCategoryBySlug(slug) {
  const rows = await query(
    "SELECT * FROM product_categories WHERE slug = ? LIMIT 1",
    [String(slug || "").trim().toLowerCase()]
  );
  return rows[0] || null;
}

async function createProduct(payload) {
  const category = await getProductCategoryBySlug(payload.category);
  if (!category || !category.is_active || category.head !== CATEGORY_HEADS.ITEM) {
    const error = new Error("Invalid item category");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  const result = await query(
    `INSERT INTO products (name, category, price, rating, image, description, in_stock, stock_qty, sku, vendor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.category,
      payload.price,
      Number(payload.rating || 0),
      payload.image,
      payload.description,
      payload.isActive == null ? 1 : (payload.isActive ? 1 : 0),
      Number(payload.stockQty || 0),
      payload.sku || null,
      String(payload.vendorId || payload.onboardedBy || "admin"),
    ]
  );

  const rows = await query(
    `SELECT id, name, category, price, image, description, in_stock, stock_qty, vendor_id, onboarded_at, created_at
     FROM products WHERE id = ?`,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateProduct(id, patch) {
  const category = await getProductCategoryBySlug(patch.category);
  if (!category || !category.is_active || category.head !== CATEGORY_HEADS.ITEM) {
    const error = new Error("Invalid item category");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  await query(
    `UPDATE products
     SET name = ?, category = ?, price = ?, rating = ?, image = ?, description = ?,
         in_stock = ?, stock_qty = ?, sku = ?, vendor_id = ?
     WHERE id = ?`,
    [
      patch.name,
      patch.category,
      patch.price,
      Number(patch.rating || 0),
      patch.image,
      patch.description,
      patch.inStock ? 1 : 0,
      patch.stockQty,
      patch.sku || null,
      String(patch.vendorId || patch.onboardedBy || "admin"),
      id,
    ]
  );
  return query(
    `SELECT id, name, category, price, image, description, in_stock, stock_qty, vendor_id, onboarded_at, created_at
     FROM products WHERE id = ?`,
    [id]
  );
}

async function bulkUpdateProductStatus(productIds = [], isActive = true) {
  const ids = Array.isArray(productIds)
    ? productIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (!ids.length) {
    const error = new Error("productIds must contain valid ids");
    error.code = "BAD_INPUT";
    throw error;
  }

  const placeholders = ids.map(() => "?").join(", ");
  await query(
    `UPDATE products SET in_stock = ? WHERE id IN (${placeholders})`,
    [isActive ? 1 : 0, ...ids]
  );

  const rows = await query(
    `SELECT id, name, in_stock, stock_qty, vendor_id FROM products WHERE id IN (${placeholders}) ORDER BY id DESC`,
    ids
  );

  return rows;
}

async function listInventory({ search, category, stockStatus } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedCategory = toSlug(category);
  const normalizedStockStatus = normalizeStatusValue(stockStatus);

  if (normalizedSearch) {
    clauses.push("(CAST(id AS CHAR) LIKE ? OR LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(sku, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like, like);
  }

  if (normalizedCategory) {
    clauses.push("category = ?");
    values.push(normalizedCategory);
  }

  if (normalizedStockStatus === "low") {
    clauses.push("stock_qty <= 5");
  } else if (normalizedStockStatus === "ok") {
    clauses.push("stock_qty > 5");
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return query(
    `SELECT id, name, category, sku, stock_qty, in_stock,
            CASE WHEN stock_qty <= 5 THEN 'LOW' ELSE 'OK' END AS stock_status
     FROM products
     ${where}
     ORDER BY stock_qty ASC, id ASC`,
    values
  );
}

async function listProductCategories({ head, search, isActive } = {}) {
  const clauses = [];
  const values = [];
  const normalizedHead = normalizeCategoryHead(head);
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedIsActive = normalizeBoolFilter(isActive);

  if (normalizedHead) {
    clauses.push("head = ?");
    values.push(normalizedHead);
  }

  if (normalizedSearch) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like);
  }

  if (normalizedIsActive !== null) {
    clauses.push("is_active = ?");
    values.push(normalizedIsActive);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  if (normalizedHead) {
    return query(`SELECT id, name, slug, head, is_active, created_at, updated_at FROM product_categories ${where} ORDER BY name ASC`, values);
  }

  return query(`SELECT id, name, slug, head, is_active, created_at, updated_at FROM product_categories ${where} ORDER BY head ASC, name ASC`, values);
}

async function createProductCategory(payload) {
  const name = String(payload.name || "").trim();
  const head = normalizeCategoryHead(payload.head);
  const slug = toSlug(payload.slug || name);
  const isActive = payload.isActive == null ? 1 : (payload.isActive ? 1 : 0);

  if (!name || !head || !slug) {
    const error = new Error("name and head are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  const exists = await query("SELECT id FROM product_categories WHERE slug = ? LIMIT 1", [slug]);
  if (exists.length) {
    const error = new Error("Category slug already exists");
    error.code = "DUPLICATE_CATEGORY";
    throw error;
  }

  const result = await query(
    "INSERT INTO product_categories (name, slug, head, is_active) VALUES (?, ?, ?, ?)",
    [name, slug, head, isActive]
  );
  const rows = await query(
    "SELECT id, name, slug, head, is_active, created_at, updated_at FROM product_categories WHERE id = ?",
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateProductCategory(id, payload) {
  const existing = await query("SELECT * FROM product_categories WHERE id = ?", [id]);
  if (!existing.length) {
    return null;
  }

  const current = existing[0];
  const name = String(payload.name ?? current.name).trim();
  const nextHead = normalizeCategoryHead(payload.head ?? current.head);
  const slug = toSlug(payload.slug || name || current.slug);
  const isActive = payload.isActive == null ? Number(current.is_active || 0) : (payload.isActive ? 1 : 0);

  if (!name || !nextHead || !slug) {
    const error = new Error("name and head are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  const duplicate = await query(
    "SELECT id FROM product_categories WHERE slug = ? AND id <> ? LIMIT 1",
    [slug, id]
  );
  if (duplicate.length) {
    const error = new Error("Category slug already exists");
    error.code = "DUPLICATE_CATEGORY";
    throw error;
  }

  await query(
    "UPDATE product_categories SET name = ?, slug = ?, head = ?, is_active = ? WHERE id = ?",
    [name, slug, nextHead, isActive, id]
  );

  const rows = await query(
    "SELECT id, name, slug, head, is_active, created_at, updated_at FROM product_categories WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

async function listServices({ search, category, isActive } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedCategory = toSlug(category);
  const normalizedIsActive = normalizeBoolFilter(isActive);

  if (normalizedSearch) {
    clauses.push("(LOWER(code) LIKE ? OR LOWER(title) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like);
  }

  if (normalizedCategory) {
    clauses.push("category_slug = ?");
    values.push(normalizedCategory);
  }

  if (normalizedIsActive !== null) {
    clauses.push("is_active = ?");
    values.push(normalizedIsActive);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(
    `SELECT id, code, title, description, category_slug, duration_minutes, image, price, is_active, created_at
     FROM services
     ${where}
     ORDER BY id ASC`,
    values
  );
}

async function createService(payload) {
  const category = await getProductCategoryBySlug(payload.category);
  if (!category || !category.is_active || category.head !== CATEGORY_HEADS.SERVICE) {
    const error = new Error("Invalid service category");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  const result = await query(
    `INSERT INTO services (code, title, description, category_slug, duration_minutes, image, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code,
      payload.title,
      payload.description || null,
      payload.category,
      Number(payload.durationMinutes || 60),
      payload.image || null,
      Number(payload.price || 0),
      payload.isActive ? 1 : 0,
    ]
  );

  const rows = await query(
    `SELECT id, code, title, description, category_slug, duration_minutes, image, price, is_active, created_at
     FROM services WHERE id = ?`,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateService(id, payload) {
  const existingRows = await query("SELECT * FROM services WHERE id = ?", [id]);
  if (!existingRows.length) {
    return null;
  }

  const current = existingRows[0];
  const nextCategory = payload.category || current.category_slug;
  const category = await getProductCategoryBySlug(nextCategory);
  if (!category || !category.is_active || category.head !== CATEGORY_HEADS.SERVICE) {
    const error = new Error("Invalid service category");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  await query(
    `UPDATE services
     SET code = ?, title = ?, description = ?, category_slug = ?, duration_minutes = ?, image = ?, price = ?, is_active = ?
     WHERE id = ?`,
    [
      String(payload.code || current.code).trim(),
      String(payload.title || current.title).trim(),
      payload.description ?? current.description,
      nextCategory,
      Number(payload.durationMinutes ?? current.duration_minutes ?? 60),
      payload.image ?? current.image,
      Number(payload.price ?? current.price ?? 0),
      payload.isActive == null ? Number(current.is_active || 0) : (payload.isActive ? 1 : 0),
      id,
    ]
  );

  const rows = await query(
    `SELECT id, code, title, description, category_slug, duration_minutes, image, price, is_active, created_at
     FROM services WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateInventory(id, stockQty) {
  await query(
    "UPDATE products SET stock_qty = ?, in_stock = ? WHERE id = ?",
    [stockQty, stockQty > 0 ? 1 : 0, id]
  );
  return query("SELECT id, name, stock_qty, in_stock FROM products WHERE id = ?", [id]);
}

async function listCustomers({ search, status } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedStatus = normalizeStatusValue(status);

  if (normalizedSearch) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(COALESCE(phone, '')) LIKE ? OR LOWER(COALESCE(email, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like);
  }

  if (normalizedStatus) {
    clauses.push("LOWER(status) = ?");
    values.push(normalizedStatus);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(`SELECT * FROM customers ${where} ORDER BY created_at DESC`, values);
}

async function createCustomer(payload) {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const status = normalizeStatusValue(payload.status) || "active";

  if (!name) {
    const error = new Error("name is required");
    error.code = "BAD_INPUT";
    throw error;
  }

  if (phone.length < 10) {
    const error = new Error("phone must be at least 10 digits");
    error.code = "BAD_INPUT";
    throw error;
  }

  try {
    const result = await query(
      `INSERT INTO customers (name, phone, email, status)
       VALUES (?, ?, ?, ?)`,
      [name, phone || null, email || null, status]
    );
    const rows = await query("SELECT * FROM customers WHERE id = ?", [result.insertId]);
    return rows[0] || null;
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate")) {
      const conflict = new Error("Customer phone already exists");
      conflict.code = "DUPLICATE_CUSTOMER";
      throw conflict;
    }
    throw error;
  }
}

async function listOrders({ search, status, paymentStatus } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedStatus = normalizeStatusValue(status);
  const normalizedPayment = normalizeStatusValue(paymentStatus);

  if (normalizedSearch) {
    clauses.push("(LOWER(id) LIKE ? OR LOWER(COALESCE(user_id, '')) LIKE ? OR LOWER(COALESCE(date, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like);
  }

  if (normalizedStatus) {
    clauses.push("LOWER(status) = ?");
    values.push(normalizedStatus);
  }

  if (normalizedPayment) {
    clauses.push("LOWER(COALESCE(payment_status, '')) = ?");
    values.push(normalizedPayment);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, values);
  return rows.map((row) => ({
    ...row,
    items_list: parseList(row.items_list),
    order_items: parseList(row.order_items),
    next_statuses: ORDER_FLOW[row.status] || [],
  }));
}

async function updateOrderStatus(id, status) {
  const existingRows = await query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!existingRows.length) return null;

  const currentStatus = String(existingRows[0].status || "Placed");
  const nextStatuses = ORDER_FLOW[currentStatus] || [];
  const normalizedStatus = String(status || "").trim();

  if (!ORDER_FLOW[normalizedStatus]) {
    const error = new Error("Unsupported order status");
    error.code = "INVALID_STATUS";
    throw error;
  }

  if (normalizedStatus !== currentStatus && !nextStatuses.includes(normalizedStatus)) {
    const error = new Error(`Invalid transition from ${currentStatus} to ${normalizedStatus}`);
    error.code = "INVALID_TRANSITION";
    throw error;
  }

  await query("UPDATE orders SET status = ? WHERE id = ?", [normalizedStatus, id]);
  const rows = await query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!rows.length) return null;
  return {
    ...rows[0],
    items_list: parseList(rows[0].items_list),
    order_items: parseList(rows[0].order_items),
    next_statuses: ORDER_FLOW[rows[0].status] || [],
  };
}

async function bulkUpdateOrderStatus(orderIds = [], status) {
  const results = [];
  const failures = [];

  for (const orderId of orderIds) {
    try {
      const updated = await updateOrderStatus(orderId, status);
      if (!updated) {
        failures.push({ orderId, message: "Order not found" });
        continue;
      }
      results.push(updated);
    } catch (error) {
      failures.push({ orderId, message: error.message });
    }
  }

  return { updated: results, failures };
}

async function listVendors({ search, status } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedStatus = normalizeStatusValue(status);

  if (normalizedSearch) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(COALESCE(contact_name, '')) LIKE ? OR LOWER(COALESCE(phone, '')) LIKE ? OR LOWER(COALESCE(email, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like, like);
  }

  if (normalizedStatus) {
    clauses.push("LOWER(status) = ?");
    values.push(normalizedStatus);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(`SELECT * FROM vendors ${where} ORDER BY created_at DESC`, values);
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

async function listPromotions({ search, isActive, discountType } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedIsActive = normalizeBoolFilter(isActive);
  const normalizedDiscountType = normalizeStatusValue(discountType);

  if (normalizedSearch) {
    clauses.push("(LOWER(code) LIKE ? OR LOWER(title) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like);
  }

  if (normalizedIsActive !== null) {
    clauses.push("is_active = ?");
    values.push(normalizedIsActive);
  }

  if (normalizedDiscountType) {
    clauses.push("LOWER(discount_type) = ?");
    values.push(normalizedDiscountType);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(`SELECT * FROM promotions ${where} ORDER BY created_at DESC`, values);
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

async function listTaxRules({ search, scope, isActive } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedScope = normalizeTaxScope(scope);
  const normalizedIsActive = normalizeBoolFilter(isActive);

  if (normalizedSearch) {
    clauses.push("(LOWER(scope) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like);
  }

  if (normalizedScope) {
    clauses.push("scope = ?");
    values.push(normalizedScope);
  }

  if (normalizedIsActive !== null) {
    clauses.push("is_active = ?");
    values.push(normalizedIsActive);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(
    `SELECT id, scope, tax_percent, charge_type, applies_on, is_active, description, updated_at
     FROM tax_rules
     ${where}
     ORDER BY scope ASC`,
    values
  );
}

async function upsertTaxRule(payload) {
  const scope = normalizeTaxScope(payload.scope);
  const taxPercent = Number(payload.taxPercent ?? payload.tax_percent);
  const requestedChargeType = normalizeChargeType(payload.chargeType || payload.charge_type);
  const requestedAppliesOn = normalizeAppliesOn(payload.appliesOn || payload.applies_on);
  const isMandatoryScope = scope === TAX_SCOPES.PLATFORM_FEE;
  const chargeType = requestedChargeType || (scope === TAX_SCOPES.PLATFORM_FEE || scope === TAX_SCOPES.TRANSPORTATION_FEE ? CHARGE_TYPES.FLAT : CHARGE_TYPES.PERCENT);
  const appliesOn = requestedAppliesOn || (scope === TAX_SCOPES.TRANSPORTATION_FEE ? APPLIES_ON.DELIVERY_ONLY : APPLIES_ON.ALWAYS);
  const isActive = isMandatoryScope ? 1 : (payload.isActive == null ? 1 : (payload.isActive ? 1 : 0));
  const description = payload.description == null ? null : String(payload.description || "").trim();

  if (!scope || Number.isNaN(taxPercent) || taxPercent < 0) {
    const error = new Error("scope and valid non-negative value are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  await query(
    `INSERT INTO tax_rules (scope, tax_percent, charge_type, applies_on, is_active, description)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tax_percent = VALUES(tax_percent),
       charge_type = VALUES(charge_type),
       applies_on = VALUES(applies_on),
       is_active = VALUES(is_active),
       description = VALUES(description)`,
    [scope, taxPercent, chargeType, appliesOn, isActive, description]
  );

  const rows = await query(
    "SELECT id, scope, tax_percent, charge_type, applies_on, is_active, description, updated_at FROM tax_rules WHERE scope = ?",
    [scope]
  );
  return rows[0] || null;
}

async function updateTaxRule(id, payload) {
  const existing = await query("SELECT * FROM tax_rules WHERE id = ?", [id]);
  if (!existing.length) {
    return null;
  }

  const current = existing[0];
  const scope = normalizeTaxScope(payload.scope || current.scope);
  const taxPercent = Number(payload.taxPercent ?? payload.tax_percent ?? current.tax_percent);
  const requestedChargeType = normalizeChargeType(payload.chargeType || payload.charge_type || current.charge_type);
  const requestedAppliesOn = normalizeAppliesOn(payload.appliesOn || payload.applies_on || current.applies_on);
  const isMandatoryScope = scope === TAX_SCOPES.PLATFORM_FEE;
  const chargeType = requestedChargeType || (scope === TAX_SCOPES.PLATFORM_FEE || scope === TAX_SCOPES.TRANSPORTATION_FEE ? CHARGE_TYPES.FLAT : CHARGE_TYPES.PERCENT);
  const appliesOn = requestedAppliesOn || (scope === TAX_SCOPES.TRANSPORTATION_FEE ? APPLIES_ON.DELIVERY_ONLY : APPLIES_ON.ALWAYS);
  const isActive = isMandatoryScope ? 1 : (payload.isActive == null ? Number(current.is_active || 0) : (payload.isActive ? 1 : 0));
  const description = payload.description == null ? current.description : String(payload.description || "").trim();

  if (!scope || Number.isNaN(taxPercent) || taxPercent < 0) {
    const error = new Error("scope and valid non-negative value are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  await query(
    "UPDATE tax_rules SET scope = ?, tax_percent = ?, charge_type = ?, applies_on = ?, is_active = ?, description = ? WHERE id = ?",
    [scope, taxPercent, chargeType, appliesOn, isActive, description, id]
  );

  const rows = await query(
    "SELECT id, scope, tax_percent, charge_type, applies_on, is_active, description, updated_at FROM tax_rules WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

function normalizePermissionList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return [];
}

async function listAdminRoles({ search, isActive } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedIsActive = normalizeBoolFilter(isActive);

  if (normalizedSearch) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like);
  }

  if (normalizedIsActive !== null) {
    clauses.push("is_active = ?");
    values.push(normalizedIsActive);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `SELECT id, name, description, permissions_json, is_active, created_at, updated_at
     FROM admin_roles
     ${where}
     ORDER BY id ASC`,
    values
  );

  return rows.map((row) => ({
    ...row,
    permissions: parseList(row.permissions_json),
  }));
}

async function createAdminRole(payload) {
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const permissions = normalizePermissionList(payload.permissions);
  const isActive = payload.isActive == null ? 1 : (payload.isActive ? 1 : 0);

  if (!name) {
    const error = new Error("name is required");
    error.code = "BAD_INPUT";
    throw error;
  }

  const result = await query(
    `INSERT INTO admin_roles (name, description, permissions_json, is_active)
     VALUES (?, ?, ?, ?)`,
    [name, description || null, JSON.stringify(permissions), isActive]
  );

  const rows = await query(
    `SELECT id, name, description, permissions_json, is_active, created_at, updated_at
     FROM admin_roles WHERE id = ?`,
    [result.insertId]
  );

  return rows[0]
    ? { ...rows[0], permissions: parseList(rows[0].permissions_json) }
    : null;
}

async function updateAdminRole(id, payload) {
  const existing = await query("SELECT * FROM admin_roles WHERE id = ?", [id]);
  if (!existing.length) return null;

  const current = existing[0];
  const name = String(payload.name ?? current.name).trim();
  const description = String(payload.description ?? current.description ?? "").trim();
  const permissions = normalizePermissionList(payload.permissions ?? parseList(current.permissions_json));
  const isActive = payload.isActive == null ? Number(current.is_active || 0) : (payload.isActive ? 1 : 0);

  if (!name) {
    const error = new Error("name is required");
    error.code = "BAD_INPUT";
    throw error;
  }

  await query(
    `UPDATE admin_roles
     SET name = ?, description = ?, permissions_json = ?, is_active = ?
     WHERE id = ?`,
    [name, description || null, JSON.stringify(permissions), isActive, id]
  );

  const rows = await query(
    `SELECT id, name, description, permissions_json, is_active, created_at, updated_at
     FROM admin_roles WHERE id = ?`,
    [id]
  );

  return rows[0]
    ? { ...rows[0], permissions: parseList(rows[0].permissions_json) }
    : null;
}

async function listAdminUsers({ search, isActive, roleId } = {}) {
  const clauses = [];
  const values = [];
  const normalizedSearch = normalizeSearchTerm(search);
  const normalizedIsActive = normalizeBoolFilter(isActive);
  const normalizedRoleId = Number(roleId || 0);

  if (normalizedSearch) {
    clauses.push("(LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.display_name, '')) LIKE ? OR LOWER(COALESCE(r.name, '')) LIKE ?)");
    const like = `%${normalizedSearch.toLowerCase()}%`;
    values.push(like, like, like);
  }

  if (normalizedIsActive !== null) {
    clauses.push("u.is_active = ?");
    values.push(normalizedIsActive);
  }

  if (normalizedRoleId > 0) {
    clauses.push("u.role_id = ?");
    values.push(normalizedRoleId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(
    `SELECT u.id, u.username, u.display_name, u.role_id, r.name AS role_name, u.is_active, u.last_login_at, u.created_at, u.updated_at
     FROM admin_users u
     LEFT JOIN admin_roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.id ASC`,
    values
  );
}

async function createAdminUser(payload) {
  const username = String(payload.username || "").trim().toLowerCase();
  const password = String(payload.password || "").trim();
  const displayName = String(payload.displayName || payload.display_name || "").trim();
  const roleId = Number(payload.roleId || payload.role_id || 0);
  const isActive = payload.isActive == null ? 1 : (payload.isActive ? 1 : 0);

  if (!username || !password || !displayName || !roleId) {
    const error = new Error("username, password, displayName and roleId are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  const role = await query("SELECT id FROM admin_roles WHERE id = ? LIMIT 1", [roleId]);
  if (!role.length) {
    const error = new Error("Invalid roleId");
    error.code = "BAD_INPUT";
    throw error;
  }

  await query(
    `INSERT INTO admin_users (username, password_hash, display_name, role_id, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [username, hashPassword(password), displayName, roleId, isActive]
  );

  const rows = await listAdminUsers({ search: username });
  return rows.find((item) => String(item.username || "") === username) || null;
}

async function updateAdminUser(id, payload) {
  const existing = await query("SELECT * FROM admin_users WHERE id = ?", [id]);
  if (!existing.length) return null;

  const current = existing[0];
  const username = String(payload.username ?? current.username).trim().toLowerCase();
  const displayName = String(payload.displayName ?? payload.display_name ?? current.display_name).trim();
  const roleId = Number(payload.roleId ?? payload.role_id ?? current.role_id);
  const isActive = payload.isActive == null ? Number(current.is_active || 0) : (payload.isActive ? 1 : 0);
  const password = String(payload.password || "").trim();

  if (!username || !displayName || !roleId) {
    const error = new Error("username, displayName and roleId are required");
    error.code = "BAD_INPUT";
    throw error;
  }

  const role = await query("SELECT id FROM admin_roles WHERE id = ? LIMIT 1", [roleId]);
  if (!role.length) {
    const error = new Error("Invalid roleId");
    error.code = "BAD_INPUT";
    throw error;
  }

  if (password) {
    await query(
      `UPDATE admin_users
       SET username = ?, password_hash = ?, display_name = ?, role_id = ?, is_active = ?
       WHERE id = ?`,
      [username, hashPassword(password), displayName, roleId, isActive, id]
    );
  } else {
    await query(
      `UPDATE admin_users
       SET username = ?, display_name = ?, role_id = ?, is_active = ?
       WHERE id = ?`,
      [username, displayName, roleId, isActive, id]
    );
  }

  const rows = await listAdminUsers({});
  return rows.find((item) => Number(item.id) === Number(id)) || null;
}

async function getAdminUserByUsername(username) {
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized) return null;

  const rows = await query(
    `SELECT u.id, u.username, u.password_hash, u.display_name, u.role_id, u.is_active,
            r.name AS role_name, r.permissions_json
     FROM admin_users u
     LEFT JOIN admin_roles r ON r.id = u.role_id
     WHERE u.username = ?
     LIMIT 1`,
    [normalized]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    ...row,
    permissions: parseList(row.permissions_json),
  };
}

async function markAdminUserLogin(userId) {
  await query("UPDATE admin_users SET last_login_at = NOW() WHERE id = ?", [Number(userId)]);
}

function verifyPassword(password, hash) {
  return hashPassword(password) === String(hash || "");
}

module.exports = {
  initDb,
  checkDbHealth,
  listProducts,
  createProduct,
  updateProduct,
  bulkUpdateProductStatus,
  listInventory,
  updateInventory,
  listCustomers,
  createCustomer,
  listOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  listVendors,
  createVendor,
  updateVendor,
  listPromotions,
  createPromotion,
  updatePromotion,
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  listServices,
  createService,
  updateService,
  listTaxRules,
  upsertTaxRule,
  updateTaxRule,
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  getAdminUserByUsername,
  markAdminUserLogin,
  verifyPassword,
};
