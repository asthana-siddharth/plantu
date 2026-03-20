import React, { useEffect, useMemo, useState } from "react";
import {
  createCustomer,
  createService,
  createProduct,
  createProductCategory,
  fetchModule,
  fetchProductCategories,
  patchBulkOrderStatus,
  patchInventory,
  patchOrderStatus,
  upsertTaxRule,
} from "./api";

const modules = [
  { key: "products", label: "Products", path: "/admin/products" },
  { key: "services", label: "Services", path: "/admin/services" },
  { key: "categoryMaster", label: "Product Category Master", path: "/admin/product-categories" },
  { key: "inventory", label: "Inventory", path: "/admin/inventory" },
  { key: "customers", label: "Customers", path: "/admin/customers" },
  { key: "orders", label: "Orders", path: "/admin/orders" },
  { key: "vendors", label: "Vendors", path: "/admin/vendors" },
  { key: "promotions", label: "Promotions", path: "/admin/promotions" },
  { key: "taxControl", label: "Tax Control", path: "/admin/tax-rules" },
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

const MODULE_FILTER_MAP = {
  products: { placeholder: "Search by product id, name, category, sku", param: "category" },
  services: { placeholder: "Search by code, title, description", param: "isActive" },
  categoryMaster: { placeholder: "Search by category name or slug", param: "head" },
  inventory: { placeholder: "Search by product id, name, category, sku", param: "stockStatus" },
  customers: { placeholder: "Search by name, phone, email", param: "status" },
  orders: { placeholder: "Search by order id, user id, date", param: "status" },
  vendors: { placeholder: "Search by name, contact, phone, email", param: "status" },
  promotions: { placeholder: "Search by code or title", param: "isActive" },
  taxControl: { placeholder: "Search by scope or description", param: "scope" },
};

function pretty(value) {
  if (value == null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatMoney(value) {
  return `Rs ${Math.round(Number(value || 0))}`;
}

function normalizeOrderLineItems(row) {
  if (!Array.isArray(row?.order_items) || row.order_items.length === 0) {
    return [];
  }

  return row.order_items.map((item, index) => ({
    id: item?.id != null ? String(item.id) : `line-${index}`,
    type: String(item?.type || "product").toLowerCase() === "service" ? "service" : "product",
    name: String(item?.name || "Item"),
    quantity: Number(item?.quantity || 1),
    lineTotal: Number(item?.lineTotal || 0),
  }));
}

function getApplicableCharges(row, hasProducts, hasServices) {
  if (!Array.isArray(row?.charge_breakdown)) {
    return [];
  }

  const deliveryMode = String(row?.delivery_mode || "pickup").toLowerCase();

  return row.charge_breakdown.filter((charge) => {
    const key = String(charge?.key || "").toLowerCase();
    const label = String(charge?.label || "").toLowerCase();
    const isItemCharge = key.includes("item") || label.includes("item");
    const isServiceCharge = key.includes("service") || label.includes("service");
    const isTransportationCharge = key.includes("transport") || label.includes("transport");

    if (isItemCharge && !hasProducts) return false;
    if (isServiceCharge && !hasServices) return false;
    if (isTransportationCharge && deliveryMode !== "delivery") return false;
    return true;
  });
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

function OrdersTable({ rows, selectedOrderIds, onToggleOrder, onToggleAll }) {
  if (!rows.length) return <p className="muted">No rows found</p>;

  const allSelected = rows.length > 0 && rows.every((row) => selectedOrderIds.includes(String(row.id)));
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th>id</th>
            <th>date</th>
            <th>status</th>
            <th>payment_status</th>
            <th>total</th>
            <th>next_statuses</th>
            <th>details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const orderId = String(row.id);
            const lineItems = normalizeOrderLineItems(row);
            const productItems = lineItems.filter((item) => item.type === "product");
            const serviceItems = lineItems.filter((item) => item.type === "service");
            const hasProducts = productItems.length > 0;
            const hasServices = serviceItems.length > 0;
            const applicableCharges = getApplicableCharges(row, hasProducts, hasServices);
            const showDetails = expandedOrderId === orderId;

            return (
              <React.Fragment key={orderId}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(orderId)}
                      onChange={() => onToggleOrder(orderId)}
                    />
                  </td>
                  <td>{pretty(row.id)}</td>
                  <td>{pretty(row.date)}</td>
                  <td>{pretty(row.status)}</td>
                  <td>{pretty(row.payment_status)}</td>
                  <td>{pretty(row.total)}</td>
                  <td>{Array.isArray(row.next_statuses) ? row.next_statuses.join(", ") : "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="detailBtn"
                      onClick={() => setExpandedOrderId(showDetails ? null : orderId)}
                    >
                      {showDetails ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {showDetails ? (
                  <tr>
                    <td colSpan={9} className="orderDetailCell">
                      <div className="orderDetailWrap">
                        {hasProducts ? (
                          <div className="orderDetailBlock">
                            <strong>Products</strong>
                            {productItems.map((item) => (
                              <div key={`p-${item.id}`} className="orderDetailLine">
                                <span>{`${item.name} x${item.quantity}`}</span>
                                <span>{formatMoney(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {hasServices ? (
                          <div className="orderDetailBlock">
                            <strong>Services</strong>
                            {serviceItems.map((item) => (
                              <div key={`s-${item.id}`} className="orderDetailLine">
                                <span>{`${item.name} x${item.quantity}`}</span>
                                <span>{formatMoney(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {applicableCharges.length > 0 ? (
                          <div className="orderDetailBlock">
                            <strong>Applicable Charges</strong>
                            {applicableCharges.map((charge, idx) => (
                              <div key={`${orderId}-${idx}`} className="orderDetailLine">
                                <span>{String(charge.label || charge.key || "Charge")}</span>
                                <span>{formatMoney(charge.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
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
  const [bulkOrderStatus, setBulkOrderStatus] = useState("Confirmed");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [inventoryId, setInventoryId] = useState("");
  const [inventoryQty, setInventoryQty] = useState("");
  const [inventoryEditCategoryFilter, setInventoryEditCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryHead, setCategoryHead] = useState("item");
  const [customerDraft, setCustomerDraft] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active",
  });
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
  const serviceCategories = useMemo(
    () => categories.filter((cat) => cat.head === "service" && Number(cat.is_active) === 1),
    [categories]
  );

  const [serviceDraft, setServiceDraft] = useState({
    code: "",
    title: "",
    category: "",
    description: "",
    durationMinutes: "60",
    image: "🧑‍🌾",
    price: "",
    isActive: true,
  });
  const [taxDraft, setTaxDraft] = useState({
    scope: "item_sgst",
    taxPercent: "9",
    chargeType: "percent",
    appliesOn: "always",
    isActive: true,
    description: "",
  });
  const inventoryFilteredRows = useMemo(() => {
    if (inventoryEditCategoryFilter === "all") return rows;
    return rows.filter((row) => String(row.category || "") === inventoryEditCategoryFilter);
  }, [rows, inventoryEditCategoryFilter]);

  async function loadCategories() {
    try {
      const data = await fetchProductCategories();
      setCategories(data);
    } catch (_err) {
      // Keep admin page functional even if category fetch fails once.
      setCategories([]);
    }
  }

  const activeFilterConfig = MODULE_FILTER_MAP[active.key] || { placeholder: "Search", param: "" };
  const activeFilterOptions = useMemo(() => {
    switch (active.key) {
      case "products":
        return [{ value: "all", label: "All Categories" }, ...itemCategories.map((cat) => ({ value: cat.slug, label: cat.name }))];
      case "services":
        return [
          { value: "all", label: "All Status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ];
      case "categoryMaster":
        return [
          { value: "all", label: "All Heads" },
          { value: "item", label: "Items" },
          { value: "service", label: "Services" },
        ];
      case "inventory":
        return [
          { value: "all", label: "All Stock Status" },
          { value: "low", label: "Low Stock" },
          { value: "ok", label: "In Stock" },
        ];
      case "customers":
      case "vendors":
        return [
          { value: "all", label: "All Status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ];
      case "orders":
        return [{ value: "all", label: "All Status" }, ...ORDER_STATUSES.map((status) => ({ value: status, label: status }))];
      case "promotions":
        return [
          { value: "all", label: "All Status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ];
      case "taxControl":
        return [
          { value: "all", label: "All Scopes" },
          { value: "item_sgst", label: "SGST on Item" },
          { value: "item_cgst", label: "CGST on Item" },
          { value: "service_sgst", label: "SGST on Service" },
          { value: "service_cgst", label: "CGST on Service" },
          { value: "platform_fee", label: "Platform Fee" },
          { value: "transportation_fee", label: "Transportation Fee" },
        ];
      default:
        return [{ value: "all", label: "All" }];
    }
  }, [active.key, itemCategories, serviceCategories]);

  function buildQueryParams() {
    const params = {};
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    if (filterValue !== "all" && activeFilterConfig.param) {
      params[activeFilterConfig.param] = filterValue;
    }

    return params;
  }

  async function loadModule(moduleObj, params = {}) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchModule(moduleObj.path, params);
      setRows(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Request failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearchTerm("");
    setFilterValue("all");
    setSelectedOrderIds([]);
    setInventoryEditCategoryFilter("all");
    loadModule(active, {});
  }, [active]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleOrderPatch(event) {
    event.preventDefault();
    if (!orderId.trim()) return;
    try {
      await patchOrderStatus(orderId.trim(), orderStatus.trim());
      await loadModule(active, buildQueryParams());
      setOrderId("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Update failed");
    }
  }

  function toggleOrderSelection(orderId) {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }

  function toggleSelectAllOrders() {
    if (!rows.length) {
      setSelectedOrderIds([]);
      return;
    }

    const visibleIds = rows.map((row) => String(row.id));
    const allSelected = visibleIds.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds(allSelected ? [] : visibleIds);
  }

  async function handleBulkOrderPatch(event) {
    event.preventDefault();
    if (!selectedOrderIds.length) {
      setError("Select at least one order");
      return;
    }

    try {
      const result = await patchBulkOrderStatus(selectedOrderIds, bulkOrderStatus.trim());
      const failedCount = Array.isArray(result?.failures) ? result.failures.length : 0;
      if (failedCount) {
        setError(`${failedCount} orders could not be updated due to transition rules.`);
      } else {
        setError("");
      }

      setSelectedOrderIds([]);
      await loadModule(active, buildQueryParams());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Bulk update failed");
    }
  }

  async function handleInventoryPatch(event) {
    event.preventDefault();
    const id = Number(inventoryId);
    const qty = Number(inventoryQty);
    if (!id || Number.isNaN(qty)) return;

    try {
      await patchInventory(id, qty);
      await loadModule(active, buildQueryParams());
      setInventoryId("");
      setInventoryQty("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Update failed");
    }
  }

  async function handleApplySearchFilters(event) {
    event.preventDefault();
    await loadModule(active, buildQueryParams());
  }

  async function handleResetSearchFilters() {
    setSearchTerm("");
    setFilterValue("all");
    setSelectedOrderIds([]);
    await loadModule(active, {});
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    if (!categoryName.trim() || !categoryHead.trim()) return;

    try {
      await createProductCategory({ name: categoryName.trim(), head: categoryHead.trim() });
      setCategoryName("");
      setCategoryHead("item");
      await Promise.all([loadCategories(), loadModule(active, buildQueryParams())]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create category failed");
    }
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();
    if (!customerDraft.name.trim() || !customerDraft.phone.trim()) return;

    try {
      await createCustomer({
        name: customerDraft.name.trim(),
        phone: customerDraft.phone.trim(),
        email: customerDraft.email.trim(),
        status: customerDraft.status,
      });
      setCustomerDraft({ name: "", phone: "", email: "", status: "active" });
      await loadModule(active, buildQueryParams());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create customer failed");
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
      await loadModule(active, buildQueryParams());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create product failed");
    }
  }

  async function handleCreateService(event) {
    event.preventDefault();

    const durationMinutes = Number(serviceDraft.durationMinutes);
    const price = Number(serviceDraft.price);

    if (!serviceDraft.code.trim() || !serviceDraft.title.trim() || !serviceDraft.category.trim()) return;
    if (Number.isNaN(durationMinutes) || Number.isNaN(price)) return;

    try {
      await createService({
        code: serviceDraft.code.trim(),
        title: serviceDraft.title.trim(),
        category: serviceDraft.category.trim(),
        description: serviceDraft.description.trim(),
        durationMinutes,
        image: serviceDraft.image.trim(),
        price,
        isActive: serviceDraft.isActive,
      });
      setServiceDraft((prev) => ({
        ...prev,
        code: "",
        title: "",
        description: "",
        price: "",
      }));
      await loadModule(active, buildQueryParams());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Create service failed");
    }
  }

  async function handleUpsertTaxRule(event) {
    event.preventDefault();

    const taxPercent = Number(taxDraft.taxPercent);
    if (!taxDraft.scope.trim() || Number.isNaN(taxPercent) || taxPercent < 0) return;

    try {
      await upsertTaxRule({
        scope: taxDraft.scope,
        taxPercent,
        chargeType: taxDraft.chargeType,
        appliesOn: taxDraft.appliesOn,
        isActive: taxDraft.isActive,
        description: taxDraft.description.trim(),
      });
      await loadModule(active, buildQueryParams());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Save tax rule failed");
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
        </div>

        <h3 className="sectionHeading">Search & Filters</h3>
        <form className="inlineForm filterForm" onSubmit={handleApplySearchFilters}>
          <input
            placeholder={activeFilterConfig.placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {activeFilterConfig.param ? (
            <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
              {activeFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          <button type="submit">Apply</button>
          <button type="button" className="secondaryBtn" onClick={handleResetSearchFilters}>
            Reset
          </button>
        </form>

        {active.key === "orders" && (
          <>
            <h3 className="sectionHeading">Order Actions</h3>
            <form className="inlineForm" onSubmit={handleBulkOrderPatch}>
              <select
                value={bulkOrderStatus}
                onChange={(e) => setBulkOrderStatus(e.target.value)}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button type="submit">Apply To Selected ({selectedOrderIds.length})</button>
            </form>

            <form className="inlineForm" onSubmit={handleOrderPatch}>
              <input
                placeholder="Single Order ID (e.g. ORD004)"
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
              <button type="submit">Update One Order</button>
            </form>
          </>
        )}

        {active.key === "inventory" && (
          <>
          <h3 className="sectionHeading">Inventory Actions</h3>
          <form className="inlineForm" onSubmit={handleInventoryPatch}>
            <select
              value={inventoryEditCategoryFilter}
              onChange={(e) => {
                const next = e.target.value;
                setInventoryEditCategoryFilter(next);
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
          </>
        )}

        {active.key === "products" && (
          <>
          <h3 className="sectionHeading">Add Product</h3>
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
          </>
        )}

        {active.key === "services" && (
          <>
          <h3 className="sectionHeading">Add Service</h3>
          <form className="inlineForm" onSubmit={handleCreateService}>
            <input
              placeholder="Service Code"
              value={serviceDraft.code}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, code: e.target.value }))}
            />
            <input
              placeholder="Service Title"
              value={serviceDraft.title}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              value={serviceDraft.category}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Select Service Category</option>
              {serviceCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Duration (minutes)"
              value={serviceDraft.durationMinutes}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, durationMinutes: e.target.value }))}
            />
            <input
              placeholder="Service Icon (emoji)"
              value={serviceDraft.image}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, image: e.target.value }))}
            />
            <input
              placeholder="Price"
              value={serviceDraft.price}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, price: e.target.value }))}
            />
            <input
              placeholder="Description"
              value={serviceDraft.description}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Add Service</button>
          </form>
          </>
        )}

        {active.key === "categoryMaster" && (
          <>
          <h3 className="sectionHeading">Add Category</h3>
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
          </>
        )}

        {active.key === "customers" && (
          <>
          <h3 className="sectionHeading">Add Customer</h3>
          <form className="inlineForm" onSubmit={handleCreateCustomer}>
            <input
              placeholder="Customer Name"
              value={customerDraft.name}
              onChange={(e) => setCustomerDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              placeholder="Phone"
              value={customerDraft.phone}
              onChange={(e) => setCustomerDraft((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              placeholder="Email"
              value={customerDraft.email}
              onChange={(e) => setCustomerDraft((prev) => ({ ...prev, email: e.target.value }))}
            />
            <select
              value={customerDraft.status}
              onChange={(e) => setCustomerDraft((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit">Add Customer</button>
          </form>
          </>
        )}

        {active.key === "taxControl" && (
          <>
          <h3 className="sectionHeading">Tax Rule</h3>
          <form className="inlineForm" onSubmit={handleUpsertTaxRule}>
            <select
              value={taxDraft.scope}
              onChange={(e) => {
                const nextScope = e.target.value;
                const isFee = nextScope === "platform_fee" || nextScope === "transportation_fee";
                setTaxDraft((prev) => ({
                  ...prev,
                  scope: nextScope,
                  chargeType: isFee ? "flat" : "percent",
                  appliesOn: nextScope === "transportation_fee" ? "delivery_only" : "always",
                  isActive: nextScope === "platform_fee" ? true : prev.isActive,
                }));
              }}
            >
              <option value="item_sgst">SGST on Item</option>
              <option value="item_cgst">CGST on Item</option>
              <option value="service_sgst">SGST on Service</option>
              <option value="service_cgst">CGST on Service</option>
              <option value="platform_fee">Platform Fee</option>
              <option value="transportation_fee">Transportation Fee</option>
            </select>
            <input
              placeholder={taxDraft.chargeType === "flat" ? "Amount (INR)" : "Tax Percent"}
              value={taxDraft.taxPercent}
              onChange={(e) => setTaxDraft((prev) => ({ ...prev, taxPercent: e.target.value }))}
            />
            <select
              value={taxDraft.chargeType}
              onChange={(e) => setTaxDraft((prev) => ({ ...prev, chargeType: e.target.value }))}
              disabled={taxDraft.scope === "platform_fee" || taxDraft.scope === "transportation_fee"}
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat Amount</option>
            </select>
            <select
              value={taxDraft.appliesOn}
              onChange={(e) => setTaxDraft((prev) => ({ ...prev, appliesOn: e.target.value }))}
              disabled={taxDraft.scope === "platform_fee" || taxDraft.scope === "transportation_fee"}
            >
              <option value="always">Always</option>
              <option value="delivery_only">Delivery Only</option>
            </select>
            <select
              value={taxDraft.isActive ? "active" : "inactive"}
              onChange={(e) =>
                setTaxDraft((prev) => ({ ...prev, isActive: e.target.value === "active" }))
              }
              disabled={taxDraft.scope === "platform_fee"}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input
              placeholder="Description"
              value={taxDraft.description}
              onChange={(e) => setTaxDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Save Tax Rule</button>
          </form>
          </>
        )}

        {loading && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          active.key === "orders" ? (
            <OrdersTable
              rows={rows}
              selectedOrderIds={selectedOrderIds}
              onToggleOrder={toggleOrderSelection}
              onToggleAll={toggleSelectAllOrders}
            />
          ) : (
            <DataTable rows={active.key === "inventory" ? inventoryFilteredRows : rows} />
          )
        )}
      </main>
    </div>
  );
}
