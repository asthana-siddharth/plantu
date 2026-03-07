import { Platform } from "react-native";

const API_PORT = 4000;

const API_HOSTS = {
	ios: "localhost",
	android: "10.0.2.2",
};

export function getApiBaseURL() {
	const host = API_HOSTS[Platform.OS] || "localhost";
	return `http://${host}:${API_PORT}`;
}

export const API_TIMEOUT_MS = 15000;
