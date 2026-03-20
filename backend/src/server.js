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
  createOrderInPrimary,
  withPrimaryTransaction,
  checkPrimaryHealth,
  checkSecondaryHealth,
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

app.post("/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) {
    return fail(res, 400, "phone and otp are required");
  }

  if (String(otp) !== "1111") {
    return fail(res, 401, "Invalid OTP");
  }

  return ok(res, {
    token: `dev-token-${String(phone)}`,
    user: {
      id: `user-${String(phone)}`,
      phone: String(phone),
      name: "Plantu User",
    },
  });
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

app.get("/orders", async (_req, res) => {
  try {
    const items = await listOrdersFromPrimary();
    return ok(res, items);
  } catch (error) {
    return fail(res, 500, `Failed to fetch orders from MySQL: ${error.message}`);
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const item = await getOrderByIdFromPrimary(req.params.id);
    if (!item) {
      return fail(res, 404, "Order not found");
    }

    return ok(res, item);
  } catch (error) {
    return fail(res, 500, `Failed to fetch order from MySQL: ${error.message}`);
  }
});

app.post("/orders", async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, "Order requires at least one item");
  }

  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.product?.price || item.price || 0);
    return sum + quantity * price;
  }, 0);

  try {
    const nextNum = await getNextOrderNumber();
    const order = {
      id: `ORD${String(nextNum).padStart(3, "0")}`,
      date: getTodayLongDate(),
      status: "Processing",
      items: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      total,
      items_list: items.map((item) => item.product?.name || "Item"),
    };

    await withPrimaryTransaction(async (connection) => {
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
