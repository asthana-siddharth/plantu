import API, { extractData } from "./api";

export async function getOrders() {
	const response = await API.get("/orders");
	return extractData(response) || [];
}

export async function createOrder(items) {
	const response = await API.post("/orders", { items });
	return extractData(response);
}
