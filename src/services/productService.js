import API, { extractData } from "./api";

export async function getProducts(params = {}) {
	const response = await API.get("/products", { params });
	return extractData(response) || [];
}

export async function getProductById(id) {
	const response = await API.get(`/products/${id}`);
	return extractData(response);
}
