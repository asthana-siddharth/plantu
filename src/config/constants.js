// Optional single override URL. Leave empty to use API_BASE_URL_CANDIDATES.
// Example: "http://13.233.10.20:4000" or "https://api.example.com"
export const API_BASE_URL_OVERRIDE = "";

export const APP_VERSION = "v0.3";

// Ordered fallback list. App will try first URL, then next on network failure.
// Keep empty for generic builds. Set API_BASE_URL_OVERRIDE for public backend.
export const API_BASE_URL_CANDIDATES = ["http://192.168.29.181:4000"];

