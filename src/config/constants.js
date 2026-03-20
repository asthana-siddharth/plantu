// Optional single override URL. Leave empty to use API_BASE_URL_CANDIDATES.
// Example: "http://13.233.10.20:4000" or "https://api.example.com"
export const API_BASE_URL_OVERRIDE = "";

// Ordered fallback list. App will try first URL, then next on network failure.
// Keep both LAN and public to support Wi-Fi and mobile-data access scenarios.
export const API_BASE_URL_CANDIDATES = [
	"http://192.168.29.181:4000",
	"http://49.36.177.206:4000",
];

