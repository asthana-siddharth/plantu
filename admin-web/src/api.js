import axios from "axios";

const baseURL = import.meta.env.VITE_ADMIN_API_URL || "http://127.0.0.1:5001";
const ADMIN_AUTH_TOKEN_KEY = "plantu.admin.auth.token";

const API = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export function getStoredAdminToken() {
  return localStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || "";
}

export function setAdminAuthToken(token) {
  const safeToken = String(token || "").trim();
  if (safeToken) {
    localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, safeToken);
  } else {
    localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  }
}

API.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  config.headers = { ...(config.headers || {}) };
  if (token) {
    config.headers["x-admin-token"] = token;
  }
  return config;
});

export async function loginAdmin(username, password) {
  const response = await API.post("/auth/login", { username, password });
  const payload = response?.data?.data || {};
  const token = String(payload.token || "").trim();
  if (token) {
    setAdminAuthToken(token);
  }
  return payload;
}

export async function fetchAuthMe() {
  const response = await API.get("/auth/me");
  return response?.data?.data || null;
}

export async function logoutAdmin() {
  try {
    await API.post("/auth/logout");
  } finally {
    setAdminAuthToken("");
  }
}

export async function fetchModule(path, params = {}) {
  const response = await API.get(path, { params });
  return response?.data?.data || [];
}

export async function patchOrderStatus(id, status) {
  const response = await API.patch(`/admin/orders/${id}/status`, { status });
  return response?.data?.data;
}

export async function patchBulkOrderStatus(orderIds, status) {
  const response = await API.patch("/admin/orders/bulk-status", { orderIds, status });
  return response?.data?.data;
}

export async function patchInventory(id, stockQty) {
  const response = await API.patch(`/admin/inventory/${id}`, { stockQty });
  return response?.data?.data;
}

export async function fetchProductCategories(head = "") {
  const response = await API.get("/admin/product-categories", {
    params: head ? { head } : {},
  });
  return response?.data?.data || [];
}

export async function createProductCategory(payload) {
  const response = await API.post("/admin/product-categories", payload);
  return response?.data?.data;
}

export async function createProduct(payload) {
  const response = await API.post("/admin/products", payload);
  return response?.data?.data;
}

export async function patchBulkProductStatus(productIds, isActive) {
  const response = await API.patch("/admin/products/bulk-status", { productIds, isActive });
  return response?.data?.data;
}

export async function uploadProductImage(payload) {
  const response = await API.post("/admin/uploads/product-image", payload);
  return response?.data?.data;
}

export async function deleteProduct(id) {
  const response = await API.delete(`/admin/products/${id}`);
  return response?.data?.data;
}

export async function createService(payload) {
  const response = await API.post("/admin/services", payload);
  return response?.data?.data;
}

export async function createCustomer(payload) {
  const response = await API.post("/admin/customers", payload);
  return response?.data?.data;
}

export async function upsertTaxRule(payload) {
  const response = await API.post("/admin/tax-rules", payload);
  return response?.data?.data;
}

export async function updateTaxRule(id, payload) {
  const response = await API.put(`/admin/tax-rules/${id}`, payload);
  return response?.data?.data;
}

export async function createRole(payload) {
  const response = await API.post("/admin/roles", payload);
  return response?.data?.data;
}

export async function updateRole(id, payload) {
  const response = await API.put(`/admin/roles/${id}`, payload);
  return response?.data?.data;
}

export async function createAdminUser(payload) {
  const response = await API.post("/admin/users", payload);
  return response?.data?.data;
}

export async function updateAdminUser(id, payload) {
  const response = await API.put(`/admin/users/${id}`, payload);
  return response?.data?.data;
}
