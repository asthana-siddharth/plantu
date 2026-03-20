import React, { useEffect, useMemo, useState } from "react";
import { fetchModule, patchInventory, patchOrderStatus } from "./api";

const modules = [
  { key: "products", label: "Products", path: "/admin/products" },
  { key: "inventory", label: "Inventory", path: "/admin/inventory" },
  { key: "customers", label: "Customers", path: "/admin/customers" },
  { key: "orders", label: "Orders", path: "/admin/orders" },
  { key: "vendors", label: "Vendors", path: "/admin/vendors" },
  { key: "promotions", label: "Promotions", path: "/admin/promotions" },
];

function pretty(value) {
  if (value == null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function DataTable({ rows }) {
  if (!rows.length) return <p className="muted">No rows found</p>;

  const columns = Object.keys(rows[0]);
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id || idx}>
              {columns.map((col) => (
                <td key={col}>{pretty(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(modules[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("Processing");
  const [inventoryId, setInventoryId] = useState("");
  const [inventoryQty, setInventoryQty] = useState("");

  const activeLabel = useMemo(() => active.label, [active]);

  async function loadModule(moduleObj) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchModule(moduleObj.path);
      setRows(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Request failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModule(active);
  }, [active]);

  async function handleOrderPatch(event) {
    event.preventDefault();
    if (!orderId.trim()) return;
    try {
      await patchOrderStatus(orderId.trim(), orderStatus.trim());
      await loadModule(active);
      setOrderId("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Update failed");
    }
  }

  async function handleInventoryPatch(event) {
    event.preventDefault();
    const id = Number(inventoryId);
    const qty = Number(inventoryQty);
    if (!id || Number.isNaN(qty)) return;

    try {
      await patchInventory(id, qty);
      await loadModule(active);
      setInventoryId("");
      setInventoryQty("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Update failed");
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Plantu Admin</h2>
        {modules.map((moduleObj) => (
          <button
            key={moduleObj.key}
            className={active.key === moduleObj.key ? "navBtn active" : "navBtn"}
            onClick={() => setActive(moduleObj)}
          >
            {moduleObj.label}
          </button>
        ))}
      </aside>

      <main className="content">
        <div className="headerRow">
          <h1>{activeLabel}</h1>
          <button className="refreshBtn" onClick={() => loadModule(active)}>
            Refresh
          </button>
        </div>

        {active.key === "orders" && (
          <form className="inlineForm" onSubmit={handleOrderPatch}>
            <input
              placeholder="Order ID (e.g. ORD004)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <input
              placeholder="Status"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            />
            <button type="submit">Update Status</button>
          </form>
        )}

        {active.key === "inventory" && (
          <form className="inlineForm" onSubmit={handleInventoryPatch}>
            <input
              placeholder="Product ID"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
            />
            <input
              placeholder="Stock Qty"
              value={inventoryQty}
              onChange={(e) => setInventoryQty(e.target.value)}
            />
            <button type="submit">Update Stock</button>
          </form>
        )}

        {loading && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && <DataTable rows={rows} />}
      </main>
    </div>
  );
}
