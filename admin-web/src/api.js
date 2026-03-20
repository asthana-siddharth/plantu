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

export async function fetchModule(path) {
  const response = await API.get(path);
  return response?.data?.data || [];
}

export async function patchOrderStatus(id, status) {
  const response = await API.patch(`/admin/orders/${id}/status`, { status });
  return response?.data?.data;
}

export async function patchInventory(id, stockQty) {
  const response = await API.patch(`/admin/inventory/${id}`, { stockQty });
  return response?.data?.data;
}
