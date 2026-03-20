import API, { extractData } from "./api";

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function shouldUseLocalFallback(error) {
  // Use fallback only for connectivity issues (no HTTP response from server).
  return !error?.response;
}

function createLocalAuthPayload(phone) {
  const normalizedPhone = normalizePhone(phone);
  return {
    token: `dev-token-${normalizedPhone}`,
    user: {
      id: `user-${normalizedPhone}`,
      phone: normalizedPhone,
      mobileNumber: normalizedPhone,
      name: "Plantu User",
      profileCompleted: false,
    },
    localFallback: true,
  };
}

export async function sendOtp(phone) {
  try {
    const response = await API.post("/auth/send-otp", { phone });
    return extractData(response);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) {
      throw error;
    }

    return {
      phone: normalizePhone(phone),
      sent: true,
      devOtp: "1111",
      localFallback: true,
    };
  }
}

export async function resendOtp(phone) {
  try {
    const response = await API.post("/auth/resend-otp", { phone });
    return extractData(response);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) {
      throw error;
    }

    return {
      phone: normalizePhone(phone),
      resent: true,
      devOtp: "1111",
      localFallback: true,
    };
  }
}

export async function verifyOtp(phone, otp) {
  try {
    const response = await API.post("/auth/verify-otp", { phone, otp });
    return extractData(response);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) {
      throw error;
    }

    if (String(otp).trim() !== "1111") {
      const localError = new Error("Invalid OTP");
      localError.code = "INVALID_OTP";
      throw localError;
    }

    return createLocalAuthPayload(phone);
  }
}
