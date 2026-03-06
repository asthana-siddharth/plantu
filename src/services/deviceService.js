import API from "./api";

// fetch list of devices
export const getDevices = () => API.get("/devices");

// toggle a device on/off
export const setDeviceState = (id, isOn) =>
  API.post(`/devices/${id}/state`, { on: isOn });

// update watering schedule / moisture threshold etc.
export const updateDevice = (id, data) => API.patch(`/devices/${id}`, data);