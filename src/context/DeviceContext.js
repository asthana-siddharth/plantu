import React, { useReducer, useEffect } from "react";
import * as deviceService from "../services/deviceService";

export const DeviceContext = React.createContext();

const initialState = {
  devices: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, devices: action.payload };
    case "LOAD_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_DEVICE":
      return {
        ...state,
        devices: state.devices.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload } : d
        ),
      };
    default:
      return state;
  }
}

export function DeviceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadDevices = async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const resp = await deviceService.getDevices();
      const mock = [
      { id: 1, name: "Patio Sprinkler", isOn: true, moisture: 34, lastSeen: Date.now() },
      { id: 2, name: "Roof Planter", isOn: false, moisture: 50, lastSeen: Date.now() },
];
      dispatch({ type: "LOAD_SUCCESS", payload: mock });
    } catch (err) {
      dispatch({ type: "LOAD_FAILURE", payload: err.message });
    }
  };

  const toggleDevice = async (id, on) => {
    try {
      await deviceService.setDeviceState(id, on);
      dispatch({ type: "UPDATE_DEVICE", payload: { id, isOn: on } });
    } catch (err) {
      // ignore or show error
    }
  };

  const updateDevice = async (id, data) => {
    try {
      const resp = await deviceService.updateDevice(id, data);
      dispatch({ type: "UPDATE_DEVICE", payload: resp.data });
    } catch (err) {}
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return (
    <DeviceContext.Provider
      value={{ ...state, loadDevices, toggleDevice, updateDevice }}
    >
      {children}
    </DeviceContext.Provider>
  );
}