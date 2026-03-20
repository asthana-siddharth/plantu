import API, { extractData } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_CACHE_KEY = "plantu.profile.cache";
const AUTH_USER_STORAGE_KEY = "plantu.auth.user";

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

async function getCachedProfile() {
  const [cachedProfileRaw, authUserRaw] = await Promise.all([
    AsyncStorage.getItem(PROFILE_CACHE_KEY),
    AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
  ]);

  const cachedProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null;
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;

  if (cachedProfile) {
    return cachedProfile;
  }

  return {
    firstName: authUser?.firstName || "",
    lastName: authUser?.lastName || "",
    mobileNumber: authUser?.mobileNumber || authUser?.phone || "",
    email: authUser?.email || "",
    addressLine1: authUser?.addressLine1 || "",
    addressLine2: authUser?.addressLine2 || "",
    addressLine3: authUser?.addressLine3 || "",
    country: authUser?.country || "",
    stateName: authUser?.stateName || "",
    city: authUser?.city || "",
    pinCode: authUser?.pinCode || "",
    profileCompleted: Boolean(authUser?.profileCompleted),
    localFallback: true,
  };
}

async function cacheProfile(profile) {
  await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export async function getMyProfile() {
  try {
    const response = await API.get("/me/profile");
    const profile = extractData(response);
    await cacheProfile(profile);
    return profile;
  } catch (error) {
    if (error?.response) {
      throw error;
    }

    return getCachedProfile();
  }
}

export async function updateMyProfile(profilePayload) {
  try {
    const response = await API.put("/me/profile", profilePayload);
    const profile = extractData(response);
    await cacheProfile(profile);
    return profile;
  } catch (error) {
    if (error?.response) {
      throw error;
    }

    const merged = {
      ...profilePayload,
      profileCompleted: computeProfileCompleted(profilePayload),
      localFallback: true,
    };

    await cacheProfile(merged);
    return merged;
  }
}
