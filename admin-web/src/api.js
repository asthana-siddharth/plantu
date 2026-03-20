import axios from "axios";

const baseURL = import.meta.env.VITE_ADMIN_API_URL || "http://127.0.0.1:5001";
const adminToken = import.meta.env.VITE_ADMIN_TOKEN || "admin123";

const API = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-admin-token": adminToken,
  },
});

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
