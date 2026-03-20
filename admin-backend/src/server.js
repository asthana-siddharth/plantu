require("dotenv").config();

const express = require("express");
const cors = require("cors");
const {
  initDb,
  checkDbHealth,
  listProducts,
  createProduct,
  updateProduct,
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
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5001);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";

app.use(cors());
app.use(express.json());

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function requireAdminToken(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) {
    return fail(res, 401, "Unauthorized admin request");
  }
  return next();
}

app.get("/health", (_req, res) => ok(res, { service: "plantu-admin-backend", status: "up" }));

app.get("/health/dependencies", async (_req, res) => {
  const db = await checkDbHealth();
  const healthy = db.ok;
  return res.status(healthy ? 200 : 503).json({ success: healthy, data: { mysql: db } });
});

app.use(requireAdminToken);

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
    if (!payload.id || !payload.name || !payload.category) {
      return fail(res, 400, "id, name and category are required");
    }
    if (payload.price == null || payload.rating == null) {
      return fail(res, 400, "price and rating are required");
    }

    await createProduct({
      ...payload,
      stockQty: Number(payload.stockQty || 0),
      inStock: Boolean(payload.inStock),
    });
    return ok(res, { created: true, id: payload.id });
  } catch (error) {
    if (error.code === "INVALID_CATEGORY") {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, `Failed to create product: ${error.message}`);
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
