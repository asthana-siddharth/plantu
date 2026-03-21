import API from "./api";
import { extractData } from "./api";

// fetch list of devices
export const getDevices = async () => {
  const response = await API.get("/devices");
  return extractData(response) || [];
};

// toggle a device on/off
export const setDeviceState = async (id, isOn) => {
  await API.post(`/devices/${id}/state`, { on: isOn });
  return { id, isOn };
};

// update watering schedule / moisture threshold etc.
export const updateDevice = async (id, data) => {
  const response = await API.patch(`/devices/${id}`, data);
  return extractData(response);
};