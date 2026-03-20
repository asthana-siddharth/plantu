import axios from "axios";
import { getApiBaseURL, getApiBaseURLCandidates, API_TIMEOUT_MS } from "../config/apiConfig";

const API_BASE_CANDIDATES = getApiBaseURLCandidates();

function canRetryWithFallback(error) {
	// Retry only on connectivity issues, not on valid HTTP responses.
	if (error?.response) return false;
	if (!error?.config) return false;

	const code = String(error?.code || "").toUpperCase();
	const retryableCodes = ["ECONNABORTED", "ERR_NETWORK", "ENETUNREACH", "EHOSTUNREACH", "ETIMEDOUT"];
	return !code || retryableCodes.includes(code);
}

const API = axios.create({
	baseURL: getApiBaseURL(),
	timeout: API_TIMEOUT_MS,
	headers: {
		"Content-Type": "application/json",
	},
});

export function setAuthToken(token) {
	if (!token) {
		delete API.defaults.headers.common.Authorization;
		return;
	}

	API.defaults.headers.common.Authorization = `Bearer ${token}`;
}

API.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (!canRetryWithFallback(error)) {
			throw error;
		}

		const currentConfig = error.config;
		const currentBaseURL = String(currentConfig.baseURL || "").replace(/\/$/, "");
		const currentIndex = API_BASE_CANDIDATES.findIndex((url) => url === currentBaseURL);
		const nextIndex = currentIndex + 1;

		if (nextIndex >= API_BASE_CANDIDATES.length) {
			throw error;
		}

		const nextBaseURL = API_BASE_CANDIDATES[nextIndex];
		const retriedConfig = {
			...currentConfig,
			baseURL: nextBaseURL,
		};

		return API.request(retriedConfig);
	}
);

export function extractData(response) {
	if (response?.data?.success && Object.prototype.hasOwnProperty.call(response.data, "data")) {
		return response.data.data;
	}

	return response?.data;
}

export default API;
