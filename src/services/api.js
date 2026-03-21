import axios from "axios";
import { getApiBaseURL, getApiBaseURLCandidates, API_TIMEOUT_MS } from "../config/apiConfig";

const API_BASE_CANDIDATES = getApiBaseURLCandidates();

function normalizeBaseURL(url) {
	return String(url || "").replace(/\/$/, "");
}

function isAuthRoute(url) {
	const value = String(url || "").toLowerCase();
	return value.includes("/auth/");
}

function canRetryWithFallback(error) {
	// Retry only on connectivity issues, not on valid HTTP responses.
	if (error?.response) return false;
	if (!error?.config) return false;

	const code = String(error?.code || "").toUpperCase();
	const retryableCodes = ["ECONNABORTED", "ERR_NETWORK", "ENETUNREACH", "EHOSTUNREACH", "ETIMEDOUT"];
	return !code || retryableCodes.includes(code);
}

function canRetryOnMissingRoute(error) {
	if (!error?.response || !error?.config) return false;

	const status = Number(error.response.status || 0);
	if (status !== 404) return false;

	const message = String(error?.response?.data?.message || "").toLowerCase();
	return message.includes("no route found");
}

function getNextBaseURL(currentBaseURL) {
	const normalizedCurrent = normalizeBaseURL(currentBaseURL);
	const currentIndex = API_BASE_CANDIDATES.findIndex((url) => normalizeBaseURL(url) === normalizedCurrent);
	const nextIndex = currentIndex + 1;

	if (nextIndex >= API_BASE_CANDIDATES.length) {
		return "";
	}

	return API_BASE_CANDIDATES[nextIndex];
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
		if (isAuthRoute(error?.config?.url)) {
			throw error;
		}

		const shouldRetryFallback = canRetryWithFallback(error);
		if (!shouldRetryFallback) {
			throw error;
		}

		const currentConfig = error.config;
		const retryCount = Number(currentConfig._fallbackRetryCount || 0);
		if (retryCount >= API_BASE_CANDIDATES.length - 1) {
			throw error;
		}

		const nextBaseURL = getNextBaseURL(currentConfig.baseURL);
		if (!nextBaseURL) {
			throw error;
		}

		const retriedConfig = {
			...currentConfig,
			baseURL: nextBaseURL,
			_fallbackRetryCount: retryCount + 1,
		};

		if (API.defaults.headers.common.Authorization) {
			retriedConfig.headers = {
				...(retriedConfig.headers || {}),
				Authorization: API.defaults.headers.common.Authorization,
			};
		}

		return API.request(retriedConfig);
	}
);

export function extractData(response) {
	if (response?.data?.success && Object.prototype.hasOwnProperty.call(response.data, "data")) {
		return response.data.data;
	}

	return response?.data;
}

export function getApiErrorMessage(error, fallbackMessage = "Request failed") {
	const status = Number(error?.response?.status || 0);
	const apiMessage = String(
		error?.response?.data?.message || error?.response?.data?.error || ""
	).trim();

	if (apiMessage) {
		return status > 0 ? `${apiMessage} (HTTP ${status})` : apiMessage;
	}

	const code = String(error?.code || "").toUpperCase();
	const message = String(error?.message || "").trim();
	if (code === "ECONNABORTED" || message.toLowerCase().includes("timeout")) {
		return `Request timed out after ${Math.floor(API_TIMEOUT_MS / 1000)} seconds.`;
	}

	if (!error?.response) {
		return "Network error: unable to reach server. Check internet or server status.";
	}

	if (status > 0) {
		return `Request failed with status ${status}.`;
	}

	return message || fallbackMessage;
}

export default API;
