import API, { extractData } from "./api";

export async function getOrders() {
	const response = await API.get("/orders");
	return extractData(response) || [];
}

export async function createOrder(items, checkout = {}) {
	const response = await API.post("/orders", {
		items,
		deliveryMode: checkout.deliveryMode || "pickup",
	});
	return extractData(response);
}

export async function getOrderById(orderId) {
	const response = await API.get(`/orders/${orderId}`);
	return extractData(response);
}

export async function cancelOrder(orderId) {
	const response = await API.post(`/orders/${orderId}/cancel`);
	return extractData(response);
}
