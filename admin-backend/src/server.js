require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  initDb,
  checkDbHealth,
  listProducts,
  createProduct,
  updateProduct,
  bulkUpdateProductStatus,
  deleteProduct,
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
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5001);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";
const ADMIN_SESSIONS = new Map();
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, "products");

if (!fs.existsSync(PRODUCT_UPLOAD_DIR)) {
  fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_ROOT));

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function requireAdminToken(req, res, next) {
  const token = String(req.headers["x-admin-token"] || "").trim();
  if (!token) {
    return fail(res, 401, "Unauthorized admin request");
  }

  if (token === ADMIN_TOKEN) {
    req.adminSession = {
      username: "admin",
      displayName: "Legacy Admin",
      roleName: "SuperAdmin",
      permissions: ["*"],
    };
    return next();
  }

  const session = ADMIN_SESSIONS.get(token);
  if (!session || !session.userId) {
    return fail(res, 401, "Unauthorized admin request");
  }

  req.adminSession = session;
  return next();
}

function sanitizeAdminUser(user) {
  if (!user) return null;

  return {
    id: Number(user.id),
    username: String(user.username || ""),
    displayName: String(user.display_name || user.displayName || ""),
    roleId: Number(user.role_id || user.roleId || 0),
    roleName: String(user.role_name || user.roleName || ""),
    isActive: Number(user.is_active || user.isActive || 0) === 1,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    lastLoginAt: user.last_login_at || user.lastLoginAt || null,
  };
}

app.get("/health", (_req, res) => ok(res, { service: "plantu-admin-backend", status: "up" }));

app.get("/health/dependencies", async (_req, res) => {
  const db = await checkDbHealth();
  const healthy = db.ok;
  return res.status(healthy ? 200 : 503).json({ success: healthy, data: { mysql: db } });
});

app.post("/auth/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    if (!username || !password) {
      return fail(res, 400, "username and password are required");
    }

    const user = await getAdminUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash) || Number(user.is_active || 0) !== 1) {
      return fail(res, 401, "Invalid username or password");
    }

    const token = `adm_${crypto.randomUUID()}`;
    const safeUser = sanitizeAdminUser(user);
    ADMIN_SESSIONS.set(token, {
      token,
      userId: safeUser.id,
      username: safeUser.username,
      displayName: safeUser.displayName,
      roleName: safeUser.roleName,
      permissions: safeUser.permissions,
      createdAt: Date.now(),
    });

    await markAdminUserLogin(safeUser.id);
    return ok(res, { token, user: safeUser });
  } catch (error) {
    return fail(res, 500, `Failed to login: ${error.message}`);
  }
});

app.use(requireAdminToken);

app.get("/auth/me", async (req, res) => {
  return ok(res, {
    username: req.adminSession.username,
    displayName: req.adminSession.displayName,
    roleName: req.adminSession.roleName,
    permissions: req.adminSession.permissions || [],
  });
});

app.post("/auth/logout", async (req, res) => {
  const token = String(req.headers["x-admin-token"] || "").trim();
  if (token && token !== ADMIN_TOKEN) {
    ADMIN_SESSIONS.delete(token);
  }
  return ok(res, { loggedOut: true });
});

app.post("/admin/uploads/product-image", async (req, res) => {
  try {
    const fileName = String(req.body?.fileName || "product-image").trim();
    const mimeType = String(req.body?.mimeType || "").trim().toLowerCase();
    const dataBase64 = String(req.body?.dataBase64 || "").trim();

    if (!mimeType.startsWith("image/")) {
      return fail(res, 400, "Only image uploads are allowed");
    }

    if (!dataBase64) {
      return fail(res, 400, "Image data is required");
    }

    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length > 100 * 1024) {
      return fail(res, 400, "Image must be <= 100KB");
    }

    const ext = mimeType.split("/")[1] || "png";
    const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.+$/, "") || "product-image";
    const finalName = `${Date.now()}_${safeBase}.${ext}`;
    const fullPath = path.join(PRODUCT_UPLOAD_DIR, finalName);
    fs.writeFileSync(fullPath, buffer);

    return ok(res, {
      imageUrl: `/uploads/products/${finalName}`,
      sizeBytes: buffer.length,
    });
  } catch (error) {
    return fail(res, 500, `Failed to upload image: ${error.message}`);
  }
});

app.get("/admin/products", async (req, res) => {
  try {
    return ok(res, await listProducts(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch products: ${error.message}`);
  }
});

app.get("/admin/product-categories", async (req, res) => {
  try {
    return ok(res, await listProductCategories(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch product categories: ${error.message}`);
  }
});

app.post("/admin/product-categories", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.head) {
      return fail(res, 400, "name and head are required");
    }
    return ok(res, await createProductCategory(payload));
  } catch (error) {
    if (error.code === "BAD_INPUT" || error.code === "DUPLICATE_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create product category: ${error.message}`);
  }
});

app.put("/admin/product-categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid category id");
    }

    const updated = await updateProductCategory(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "Product category not found");
    }
    return ok(res, updated);
  } catch (error) {
    if (error.code === "BAD_INPUT" || error.code === "DUPLICATE_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update product category: ${error.message}`);
  }
});

app.post("/admin/products", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.category) {
      return fail(res, 400, "name and category are required");
    }
    if (payload.price == null) {
      return fail(res, 400, "price is required");
    }

    const created = await createProduct({
      ...payload,
      stockQty: 0,
      rating: 0,
      isActive: payload.isActive == null ? true : Boolean(payload.isActive),
      onboardedBy: req.adminSession?.username || "admin",
    });
    return ok(res, created);
  } catch (error) {
    if (error.code === "INVALID_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create product: ${error.message}`);
  }
});

app.patch("/admin/products/bulk-status", async (req, res) => {
  try {
    const productIds = Array.isArray(req.body?.productIds)
      ? req.body.productIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (!productIds.length) {
      return fail(res, 400, "productIds must contain at least one valid id");
    }

    const isActive = Boolean(req.body?.isActive);
    const updated = await bulkUpdateProductStatus(productIds, isActive);
    return ok(res, { updated });
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to bulk update product status: ${error.message}`);
  }
});

app.put("/admin/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await updateProduct(id, {
      ...req.body,
      stockQty: Number(req.body?.stockQty || 0),
      inStock: Boolean(req.body?.inStock),
    });
    if (!rows.length) return fail(res, 404, "Product not found");
    return ok(res, rows[0]);
  } catch (error) {
    if (error.code === "INVALID_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update product: ${error.message}`);
  }
});

app.delete("/admin/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid product id");
    }

    const deletedCount = await deleteProduct(id);
    if (!deletedCount) {
      return fail(res, 404, "Product not found");
    }

    return ok(res, { deleted: true, id });
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to delete product: ${error.message}`);
  }
});

app.get("/admin/inventory", async (req, res) => {
  try {
    return ok(res, await listInventory(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch inventory: ${error.message}`);
  }
});

app.get("/admin/services", async (req, res) => {
  try {
    return ok(res, await listServices(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch services: ${error.message}`);
  }
});

app.post("/admin/services", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.code || !payload.title || payload.price == null || !payload.category) {
      return fail(res, 400, "code, title, category and price are required");
    }

    const created = await createService(payload);
    return ok(res, created);
  } catch (error) {
    if (error.code === "INVALID_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create service: ${error.message}`);
  }
});

app.put("/admin/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid service id");
    }

    const updated = await updateService(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "Service not found");
    }

    return ok(res, updated);
  } catch (error) {
    if (error.code === "INVALID_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update service: ${error.message}`);
  }
});

app.patch("/admin/inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const stockQty = Number(req.body?.stockQty);
    if (Number.isNaN(stockQty) || stockQty < 0) {
      return fail(res, 400, "stockQty must be a valid non-negative number");
    }

    const rows = await updateInventory(id, stockQty);
    if (!rows.length) return fail(res, 404, "Product not found");
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, 500, `Failed to update inventory: ${error.message}`);
  }
});

app.get("/admin/customers", async (req, res) => {
  try {
    return ok(res, await listCustomers(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch customers: ${error.message}`);
  }
});

app.post("/admin/customers", async (req, res) => {
  try {
    const payload = req.body || {};
    return ok(res, await createCustomer(payload));
  } catch (error) {
    if (error.code === "BAD_INPUT" || error.code === "DUPLICATE_CUSTOMER") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create customer: ${error.message}`);
  }
});

app.get("/admin/orders", async (req, res) => {
  try {
    return ok(res, await listOrders(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch orders: ${error.message}`);
  }
});

app.patch("/admin/orders/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim();
    if (!status) return fail(res, 400, "status is required");

    const updated = await updateOrderStatus(req.params.id, status);
    if (!updated) return fail(res, 404, "Order not found");
    return ok(res, updated);
  } catch (error) {
    if (error.code === "INVALID_STATUS" || error.code === "INVALID_TRANSITION") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update order status: ${error.message}`);
  }
});

app.patch("/admin/orders/bulk-status", async (req, res) => {
  try {
    const orderIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const status = String(req.body?.status || "").trim();

    if (!orderIds.length) {
      return fail(res, 400, "orderIds must contain at least one order id");
    }

    if (!status) {
      return fail(res, 400, "status is required");
    }

    const result = await bulkUpdateOrderStatus(orderIds, status);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, `Failed to bulk update order status: ${error.message}`);
  }
});

app.get("/admin/vendors", async (req, res) => {
  try {
    return ok(res, await listVendors(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch vendors: ${error.message}`);
  }
});

app.post("/admin/vendors", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name) return fail(res, 400, "name is required");
    const rows = await createVendor(payload);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, 500, `Failed to create vendor: ${error.message}`);
  }
});

app.put("/admin/vendors/:id", async (req, res) => {
  try {
    const rows = await updateVendor(Number(req.params.id), req.body || {});
    if (!rows.length) return fail(res, 404, "Vendor not found");
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, 500, `Failed to update vendor: ${error.message}`);
  }
});

app.get("/admin/promotions", async (req, res) => {
  try {
    return ok(res, await listPromotions(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch promotions: ${error.message}`);
  }
});

app.get("/admin/tax-rules", async (req, res) => {
  try {
    return ok(res, await listTaxRules(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch tax rules: ${error.message}`);
  }
});

app.get("/admin/roles", async (req, res) => {
  try {
    return ok(res, await listAdminRoles(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch roles: ${error.message}`);
  }
});

app.post("/admin/roles", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name) {
      return fail(res, 400, "name is required");
    }
    return ok(res, await createAdminRole(payload));
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create role: ${error.message}`);
  }
});

app.put("/admin/roles/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid role id");
    }
    const updated = await updateAdminRole(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "Role not found");
    }
    return ok(res, updated);
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update role: ${error.message}`);
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    return ok(res, await listAdminUsers(req.query || {}));
  } catch (error) {
    return fail(res, 500, `Failed to fetch users: ${error.message}`);
  }
});

app.post("/admin/users", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.username || !payload.password || !payload.displayName || !payload.roleId) {
      return fail(res, 400, "username, password, displayName and roleId are required");
    }
    return ok(res, await createAdminUser(payload));
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create user: ${error.message}`);
  }
});

app.put("/admin/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid user id");
    }
    const updated = await updateAdminUser(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "User not found");
    }
    return ok(res, updated);
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update user: ${error.message}`);
  }
});

app.post("/admin/tax-rules", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.scope || payload.taxPercent == null) {
      return fail(res, 400, "scope and taxPercent are required");
    }

    return ok(res, await upsertTaxRule(payload));
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to upsert tax rule: ${error.message}`);
  }
});

app.put("/admin/tax-rules/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid tax rule id");
    }

    const updated = await updateTaxRule(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "Tax rule not found");
    }
    return ok(res, updated);
  } catch (error) {
    if (error.code === "BAD_INPUT") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to update tax rule: ${error.message}`);
  }
});

app.post("/admin/promotions", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.code || !payload.title || payload.discountValue == null) {
      return fail(res, 400, "code, title and discountValue are required");
    }
    const rows = await createPromotion(payload);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, 500, `Failed to create promotion: ${error.message}`);
  }
});

app.put("/admin/promotions/:id", async (req, res) => {
  try {
    const rows = await updatePromotion(Number(req.params.id), req.body || {});
    if (!rows.length) return fail(res, 404, "Promotion not found");
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, 500, `Failed to update promotion: ${error.message}`);
  }
});

app.use((req, res) => fail(res, 404, `No route found for ${req.method} ${req.originalUrl}`));

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Plantu admin backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start admin backend:", error.message);
  process.exit(1);
});
