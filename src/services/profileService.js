import API, { extractData } from "./api";

const PROFILE_REQUEST_TIMEOUT_MS = 4000;

function computeProfileCompleted(profile = {}) {
  const required = [
    "firstName",
    "lastName",
    "mobileNumber",
    "email",
    "addressLine1",
    "country",
    "stateName",
    "city",
    "pinCode",
  ];

  return required.every((key) => String(profile[key] || "").trim().length > 0);
}

function normalizeProfile(profile = {}) {
  return {
    firstName: String(profile.firstName || "").trim(),
    lastName: String(profile.lastName || "").trim(),
    mobileNumber: String(profile.mobileNumber || profile.phone || "").trim(),
    email: String(profile.email || "").trim(),
    addressLine1: String(profile.addressLine1 || "").trim(),
    addressLine2: String(profile.addressLine2 || "").trim(),
    addressLine3: String(profile.addressLine3 || "").trim(),
    country: String(profile.country || "").trim(),
    stateName: String(profile.stateName || "").trim(),
    city: String(profile.city || "").trim(),
    pinCode: String(profile.pinCode || "").trim(),
    profileCompleted: Boolean(profile.profileCompleted || computeProfileCompleted(profile)),
  };
}

export async function getMyProfile() {
  const response = await API.get("/me/profile", { timeout: PROFILE_REQUEST_TIMEOUT_MS });
  return normalizeProfile(extractData(response) || {});
}

export async function updateMyProfile(profilePayload) {
  const payload = {
    ...profilePayload,
    profileCompleted: computeProfileCompleted(profilePayload),
  };

  const response = await API.put("/me/profile", payload, { timeout: PROFILE_REQUEST_TIMEOUT_MS });
  return normalizeProfile(extractData(response) || {});
}
