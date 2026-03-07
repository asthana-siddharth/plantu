import API from "./api";
import { extractData } from "./api";

// fetch list of devices
export const getDevices = async () => {
  const response = await API.get("/devices");
  return extractData(response) || [];
};

// toggle a device on/off
export const setDeviceState = (id, isOn) =>
  API.post(`/devices/${id}/state`, { on: isOn });

// update watering schedule / moisture threshold etc.
export const updateDevice = async (id, data) => {
  const response = await API.patch(`/devices/${id}`, data);
  return extractData(response);
};