import API, { extractData } from "./api";

function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProduct(product = {}) {
	const stockQty = Math.max(
		0,
		toNumber(
			product.stockQty ?? product.stock_qty ?? product.stock ?? product.availableQty,
			0
		)
	);

	const inStockFlag =
		typeof product.inStock === "boolean"
			? product.inStock
			: typeof product.in_stock === "boolean"
			? product.in_stock
			: stockQty > 0;

	return {
		...product,
		price: toNumber(product.price, 0),
		rating: toNumber(product.rating, 0),
		stockQty,
		inStock: Boolean(inStockFlag) && stockQty > 0,
	};
}

export async function getProducts(params = {}) {
	const response = await API.get("/products", { params });
	const data = extractData(response) || [];
	return Array.isArray(data) ? data.map(normalizeProduct) : [];
}

export async function getProductById(id) {
	const response = await API.get(`/products/${id}`);
	return normalizeProduct(extractData(response) || {});
}
