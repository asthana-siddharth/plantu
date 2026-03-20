require("dotenv").config();

const express = require("express");
const cors = require("cors");
const {
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
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function getTodayLongDate() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseToken(req) {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function parseUserIdFromToken(token) {
  if (!token.startsWith("dev-token-")) {
    return "";
  }

  const phone = token.slice("dev-token-".length).trim();
  return phone ? `user-${phone}` : "";
}

function parsePhoneFromToken(token) {
  if (!token.startsWith("dev-token-")) {
    return "";
  }

  return token.slice("dev-token-".length).trim();
}

async function requireAuth(req, res, next) {
  const token = parseToken(req);
  const userId = parseUserIdFromToken(token);
  const phoneFromToken = parsePhoneFromToken(token);

  if (!token || !userId || !phoneFromToken) {
    return fail(res, 401, "Unauthorized");
  }

  let user = await getUserById(userId);
  if (!user) {
    // Recover gracefully if DB was reset but client still has a valid token.
    user = await findOrCreateUserByPhone(phoneFromToken);
  }

  req.auth = {
    token,
    user,
  };

  return next();
}

function normalizeOrderStatus(status) {
  return String(status || "").trim() || "Placed";
}

app.get("/health", (_req, res) => {
  return ok(res, {
    service: "plantu-backend",
    status: "up",
    dbMode: "mysql-single",
    orderReadModel: "mysql",
  });
});

app.get("/health/dependencies", async (_req, res) => {
  const [primary, secondary] = await Promise.all([
    checkPrimaryHealth(),
    checkSecondaryHealth(),
  ]);

  const allHealthy = primary.ok && secondary.ok;
  const statusCode = allHealthy ? 200 : 503;

  return res.status(statusCode).json({
    success: allHealthy,
    data: {
      mysql: primary,
      mysqlReader: secondary,
    },
  });
});

app.post("/auth/send-otp", (req, res) => {
  const { phone } = req.body || {};
  if (!phone || String(phone).trim().length < 10) {
    return fail(res, 400, "Please provide a valid phone number");
  }

  return ok(res, {
    phone: String(phone),
    sent: true,
    devOtp: "1111",
  });
});

app.post("/auth/resend-otp", (req, res) => {
  const { phone } = req.body || {};
  if (!phone || String(phone).trim().length < 10) {
    return fail(res, 400, "Please provide a valid phone number");
  }

  return ok(res, {
    phone: String(phone),
    resent: true,
    devOtp: "1111",
  });
});

app.post("/auth/verify-otp", async (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) {
    return fail(res, 400, "phone and otp are required");
  }

  if (String(otp) !== "1111") {
    return fail(res, 401, "Invalid OTP");
  }

  try {
    const user = await findOrCreateUserByPhone(phone);
    return ok(res, {
      token: `dev-token-${String(phone)}`,
      user,
    });
  } catch (error) {
    return fail(res, 500, `Failed to verify OTP: ${error.message}`);
  }
});

app.get("/products", async (req, res) => {
  try {
    const { category, search } = req.query;
    const items = await listProducts({ category, search });
    return ok(res, items);
  } catch (error) {
    return fail(res, 500, `Failed to fetch products: ${error.message}`);
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const product = await getProductById(id);
    if (!product) {
      return fail(res, 404, "Product not found");
    }

    return ok(res, product);
  } catch (error) {
    return fail(res, 500, `Failed to fetch product: ${error.message}`);
  }
});

app.get("/services", async (_req, res) => {
  try {
    return ok(res, await listServices());
  } catch (error) {
    return fail(res, 500, `Failed to fetch services: ${error.message}`);
  }
});

app.get("/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return fail(res, 400, "Invalid service id");
    }

    const service = await getServiceById(id);
    if (!service) {
      return fail(res, 404, "Service not found");
    }

    return ok(res, service);
  } catch (error) {
    return fail(res, 500, `Failed to fetch service: ${error.message}`);
  }
});

app.get("/devices", async (_req, res) => {
  try {
    const items = await listDevices();
    return ok(res, items);
  } catch (error) {
    return fail(res, 500, `Failed to fetch devices: ${error.message}`);
  }
});

app.post("/devices/:id/state", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateDeviceState(id, Boolean(req.body?.on));
    if (!updated) {
      return fail(res, 404, "Device not found");
    }

    return ok(res, updated);
  } catch (error) {
    return fail(res, 500, `Failed to update device state: ${error.message}`);
  }
});

app.patch("/devices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await patchDevice(id, req.body || {});
    if (!updated) {
      return fail(res, 404, "Device not found");
    }

    return ok(res, updated);
  } catch (error) {
    return fail(res, 500, `Failed to update device: ${error.message}`);
  }
});

app.get("/me/profile", requireAuth, async (req, res) => {
  return ok(res, req.auth.user);
});

app.put("/me/profile", requireAuth, async (req, res) => {
  try {
    const updated = await updateUserProfile(req.auth.user.id, req.body || {});
    if (!updated) {
      return fail(res, 404, "User not found");
    }

    return ok(res, updated);
  } catch (error) {
    return fail(res, 500, `Failed to update profile: ${error.message}`);
  }
});

app.get("/orders", requireAuth, async (req, res) => {
  try {
    const items = await listOrdersFromPrimary(req.auth.user.id);
    return ok(res, items);
  } catch (error) {
    return fail(res, 500, `Failed to fetch orders from MySQL: ${error.message}`);
  }
});

app.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const item = await getOrderByIdFromPrimary(req.params.id, req.auth.user.id);
    if (!item) {
      return fail(res, 404, "Order not found");
    }

    return ok(res, item);
  } catch (error) {
    return fail(res, 500, `Failed to fetch order from MySQL: ${error.message}`);
  }
});

app.post("/orders", requireAuth, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, "Order requires at least one item");
  }

  if (!req.auth.user.profileCompleted) {
    return fail(res, 400, "Complete profile before placing order");
  }

  try {
    const nextNum = await getNextOrderNumber();
    const orderId = `ORD${String(nextNum).padStart(3, "0")}`;
    const normalizedItems = [];

    let total = 0;
    let totalUnits = 0;

    for (const item of items) {
      const type = String(item.productType || item.type || "product");
      const quantity = Math.max(1, Number(item.quantity || 1));

      if (type === "service") {
        const linePrice = Number(item.product?.price || item.price || 0);
        const title = item.product?.name || item.product?.title || "Service";
        normalizedItems.push({
          type,
          id: String(item.product?.id || item.id || title),
          name: title,
          unitPrice: linePrice,
          quantity,
          lineTotal: linePrice * quantity,
        });
        total += linePrice * quantity;
        totalUnits += quantity;
        continue;
      }

      const productId = Number(item.product?.id || item.id);
      const stockRow = await getProductStockById(productId);
      if (!stockRow) {
        return fail(res, 400, `Product ${productId} not found`);
      }

      if (Number(stockRow.stock_qty) < quantity) {
        return fail(res, 400, `Insufficient inventory for ${stockRow.name}`);
      }

      const linePrice = Number(item.product?.price || stockRow.price || 0);
      normalizedItems.push({
        type: "product",
        id: productId,
        name: item.product?.name || stockRow.name,
        unitPrice: linePrice,
        quantity,
        lineTotal: linePrice * quantity,
      });
      total += linePrice * quantity;
      totalUnits += quantity;
    }

    const order = {
      id: orderId,
      date: getTodayLongDate(),
      status: normalizeOrderStatus(req.body?.status),
      items: totalUnits,
      total,
      items_list: normalizedItems.map((item) => item.name),
      order_items: normalizedItems,
      user_id: req.auth.user.id,
      payment_status: "paid",
    };

    await withPrimaryTransaction(async (connection) => {
      for (const item of normalizedItems) {
        if (item.type !== "product") {
          continue;
        }

        const reduced = await decrementProductStock(item.id, item.quantity, connection);
        if (!reduced) {
          throw new Error(`Insufficient inventory for product ${item.id}`);
        }
      }

      await createOrderInPrimary(order, connection);
    });

    return ok(res, order);
  } catch (error) {
    return fail(res, 500, `Failed to create order in MySQL: ${error.message}`);
  }
});

app.use((req, res) => {
  return fail(res, 404, `No route found for ${req.method} ${req.originalUrl}`);
});

async function start() {
  await initDb();

  app.listen(PORT, () => {
    console.log(`Plantu backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});