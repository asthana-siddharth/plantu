import API, { extractData } from "./api";

export async function getServices() {
  const response = await API.get("/services");
  return extractData(response) || [];
}

export async function getServiceById(id) {
  const response = await API.get(`/services/${id}`);
  return extractData(response);
}
