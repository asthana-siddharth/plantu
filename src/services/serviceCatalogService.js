import API, { extractData } from "./api";

export async function getServices() {
  const response = await API.get("/services");
  return extractData(response) || [];
}
