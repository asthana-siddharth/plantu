import axios from "axios";
import { getApiBaseURL, API_TIMEOUT_MS } from "../config/apiConfig";

const API = axios.create({
	baseURL: getApiBaseURL(),
	timeout: API_TIMEOUT_MS,
	headers: {
		"Content-Type": "application/json",
	},
});

export function extractData(response) {
	if (response?.data?.success && Object.prototype.hasOwnProperty.call(response.data, "data")) {
		return response.data.data;
	}

	return response?.data;
}

export default API;
