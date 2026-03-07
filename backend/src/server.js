const express = require("express");
const cors = require("cors");
const { products, devices, orders } = require("./data");

const app = express();
const PORT = process.env.PORT || 4000;

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
  return ok(res, { service: "plantu-backend", status: "up" });
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

app.get("/products", (req, res) => {
  const { category, search } = req.query;

  let result = [...products];
  if (category && category !== "all") {
    result = result.filter((p) => p.category === category);
  }

  if (search) {
    const query = String(search).toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(query));
  }

  return ok(res, result);
});

app.get("/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return fail(res, 404, "Product not found");
  }

  return ok(res, product);
});

app.get("/devices", (_req, res) => {
  return ok(res, devices);
});

app.post("/devices/:id/state", (req, res) => {
  const id = Number(req.params.id);
  const { on } = req.body || {};

  const index = devices.findIndex((d) => d.id === id);
  if (index < 0) {
    return fail(res, 404, "Device not found");
  }

  devices[index] = {
    ...devices[index],
    isOn: Boolean(on),
    lastSeen: Date.now(),
  };

  return ok(res, devices[index]);
});

app.patch("/devices/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = devices.findIndex((d) => d.id === id);
  if (index < 0) {
    return fail(res, 404, "Device not found");
  }

  devices[index] = {
    ...devices[index],
    ...req.body,
    id,
    lastSeen: Date.now(),
  };

  return ok(res, devices[index]);
});

app.get("/orders", (_req, res) => {
  return ok(res, orders);
});

app.post("/orders", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, "Order requires at least one item");
  }

  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.product?.price || item.price || 0);
    return sum + quantity * price;
  }, 0);

  const nextNum = orders.length + 1;
  const order = {
    id: `ORD${String(nextNum).padStart(3, "0")}`,
    date: getTodayLongDate(),
    status: "Processing",
    items: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    total,
    items_list: items.map((item) => item.product?.name || "Item"),
  };

  orders.unshift(order);
  return ok(res, order);
});

app.use((req, res) => {
  return fail(res, 404, `No route found for ${req.method} ${req.originalUrl}`);
});

app.listen(PORT, () => {
  console.log(`Plantu backend running on http://localhost:${PORT}`);
});
