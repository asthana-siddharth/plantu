import API, { extractData } from "./api";
import { normalizePhoneNumber } from "../utils/phone";

const AUTH_REQUEST_TIMEOUT_MS = 4000;

export async function sendOtp(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const response = await API.post("/auth/send-otp", { phone: normalizedPhone }, { timeout: AUTH_REQUEST_TIMEOUT_MS });
  return extractData(response);
}

export async function resendOtp(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const response = await API.post("/auth/resend-otp", { phone: normalizedPhone }, { timeout: AUTH_REQUEST_TIMEOUT_MS });
  return extractData(response);
}

export async function verifyOtp(phone, otp) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const response = await API.post("/auth/verify-otp", { phone: normalizedPhone, otp }, { timeout: AUTH_REQUEST_TIMEOUT_MS });
  return extractData(response);
}
