import API, { extractData } from "./api";

export async function getMyProfile() {
  const response = await API.get("/me/profile");
  return extractData(response);
}

export async function updateMyProfile(profilePayload) {
  const response = await API.put("/me/profile", profilePayload);
  return extractData(response);
}
