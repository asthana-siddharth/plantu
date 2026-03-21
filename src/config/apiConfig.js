import { Platform } from "react-native";
import { API_BASE_URL_OVERRIDE, API_BASE_URL_CANDIDATES } from "./constants";

const API_PORT = 4000;

const API_HOSTS = {
	ios: "localhost",
	android: "10.0.2.2",
};

function normalizeURL(url) {
	return String(url || "").trim().replace(/\/$/, "");
}

export function getApiBaseURLCandidates() {
	const candidates = [];

	if (API_BASE_URL_OVERRIDE && API_BASE_URL_OVERRIDE.trim().length > 0) {
		candidates.push(API_BASE_URL_OVERRIDE);
	}

	if (Array.isArray(API_BASE_URL_CANDIDATES)) {
		candidates.push(...API_BASE_URL_CANDIDATES);
	}

	// Only add platform default host when no explicit candidate is provided.
	if (candidates.length === 0) {
		const host = API_HOSTS[Platform.OS] || "localhost";
		candidates.push(`http://${host}:${API_PORT}`);
	}

	return [...new Set(candidates.map(normalizeURL).filter(Boolean))];
}

export function getApiBaseURL() {
	return getApiBaseURLCandidates()[0];
}

export const API_TIMEOUT_MS = 4000;
