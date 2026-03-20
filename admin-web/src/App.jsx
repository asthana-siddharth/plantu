import React, { useEffect, useMemo, useState } from "react";
import {
  createProduct,
  createProductCategory,
  fetchModule,
  fetchProductCategories,
  patchInventory,
  patchOrderStatus,
} from "./api";

const modules = [
  { key: "products", label: "Products", path: "/admin/products" },
  { key: "categoryMaster", label: "Product Category Master", path: "/admin/product-categories" },
  { key: "inventory", label: "Inventory", path: "/admin/inventory" },
  { key: "customers", label: "Customers", path: "/admin/customers" },
  { key: "orders", label: "Orders", path: "/admin/orders" },
  { key: "vendors", label: "Vendors", path: "/admin/vendors" },
  { key: "promotions", label: "Promotions", path: "/admin/promotions" },
];

const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
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
  const [orderStatus, setOrderStatus] = useState("Confirmed");
  const [inventoryId, setInventoryId] = useState("");
  const [inventoryQty, setInventoryQty] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryHead, setCategoryHead] = useState("item");
  const [productDraft, setProductDraft] = useState({
    id: "",
    name: "",
    category: "",
    price: "",
    rating: "4.5",
    image: "plant",
    description: "",
    stockQty: "10",
    inStock: true,
  });

  const activeLabel = useMemo(() => active.label, [active]);
  const itemCategories = useMemo(
    () => categories.filter((cat) => cat.head === "item" && Number(cat.is_active) === 1),
    [categories]
  );
  const inventoryFilteredRows = useMemo(() => {
    if (active.key !== "inventory") return rows;
    if (inventoryCategoryFilter === "all") return rows;
    return rows.filter((row) => String(row.category || "") === inventoryCategoryFilter);
  }, [rows, inventoryCategoryFilter, active.key]);

  async function loadCategories() {
    try {
      const data = await fetchProductCategories();
      setCategories(data);
    } catch (_err) {
      // Keep admin page functional even if category fetch fails once.
      setCategories([]);
    }
  }

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

  useEffect(() => {
    loadCategories();
  }, []);

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

  async function handleCreateCategory(event) {
    event.preventDefault();
    if (!categoryName.trim() || !categoryHead.trim()) return;

    try {
      await createProductCategory({ name: categoryName.trim(), head: categoryHead.trim() });
      setCategoryName("");
      setCategoryHead("item");
      await Promise.all([loadCategories(), loadModule(active)]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create category failed");
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    const parsedId = Number(productDraft.id);
    const parsedPrice = Number(productDraft.price);
    const parsedRating = Number(productDraft.rating);
    const parsedStockQty = Number(productDraft.stockQty);

    if (!parsedId || !productDraft.name.trim() || !productDraft.category.trim()) return;
    if (Number.isNaN(parsedPrice) || Number.isNaN(parsedRating) || Number.isNaN(parsedStockQty)) return;

    try {
      await createProduct({
        id: parsedId,
        name: productDraft.name.trim(),
        category: productDraft.category.trim(),
        price: parsedPrice,
        rating: parsedRating,
        image: productDraft.image.trim() || "plant",
        description: productDraft.description.trim() || "",
        stockQty: parsedStockQty,
        inStock: productDraft.inStock,
      });
      setProductDraft((prev) => ({
        ...prev,
        id: "",
        name: "",
        price: "",
        description: "",
        stockQty: "10",
      }));
      await loadModule(active);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create product failed");
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
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="submit">Update Status</button>
          </form>
        )}

        {active.key === "inventory" && (
          <form className="inlineForm" onSubmit={handleInventoryPatch}>
            <select
              value={inventoryCategoryFilter}
              onChange={(e) => {
                const next = e.target.value;
                setInventoryCategoryFilter(next);
                setInventoryId("");
              }}
            >
              <option value="all">All Item Categories</option>
              {itemCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
            >
              <option value="">Select Product</option>
              {inventoryFilteredRows.map((row) => (
                <option key={row.id} value={row.id}>
                  #{row.id} {row.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Stock Qty"
              value={inventoryQty}
              onChange={(e) => setInventoryQty(e.target.value)}
            />
            <button type="submit">Update Stock</button>
          </form>
        )}

        {active.key === "products" && (
          <form className="inlineForm" onSubmit={handleCreateProduct}>
            <input
              placeholder="ID"
              value={productDraft.id}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, id: e.target.value }))}
            />
            <input
              placeholder="Product Name"
              value={productDraft.name}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              value={productDraft.category}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Select Category</option>
              {itemCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Price"
              value={productDraft.price}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, price: e.target.value }))}
            />
            <input
              placeholder="Rating"
              value={productDraft.rating}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, rating: e.target.value }))}
            />
            <input
              placeholder="Image Key (plant/pot/seed/tool)"
              value={productDraft.image}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, image: e.target.value }))}
            />
            <input
              placeholder="Stock Qty"
              value={productDraft.stockQty}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, stockQty: e.target.value }))}
            />
            <input
              placeholder="Description"
              value={productDraft.description}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Add Product</button>
          </form>
        )}

        {active.key === "categoryMaster" && (
          <form className="inlineForm" onSubmit={handleCreateCategory}>
            <input
              placeholder="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <select
              value={categoryHead}
              onChange={(e) => setCategoryHead(e.target.value)}
            >
              <option value="item">Items</option>
              <option value="service">Services</option>
            </select>
            <button type="submit">Add Category</button>
          </form>
        )}

        {loading && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <DataTable rows={active.key === "inventory" ? inventoryFilteredRows : rows} />
        )}
      </main>
    </div>
  );
}
