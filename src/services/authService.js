import API, { extractData } from "./api";

export async function sendOtp(phone) {
  const response = await API.post("/auth/send-otp", { phone });
  return extractData(response);
}

export async function resendOtp(phone) {
  const response = await API.post("/auth/resend-otp", { phone });
  return extractData(response);
}

export async function verifyOtp(phone, otp) {
  const response = await API.post("/auth/verify-otp", { phone, otp });
  return extractData(response);
}
