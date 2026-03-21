import React, { useReducer, useEffect } from "react";
import * as deviceService from "../services/deviceService";
import { getApiErrorMessage } from "../services/api";

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
      const devices = await deviceService.getDevices();
      dispatch({ type: "LOAD_SUCCESS", payload: devices });
    } catch (err) {
      dispatch({ type: "LOAD_FAILURE", payload: getApiErrorMessage(err, "Unable to load irrigation devices.") });
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
      const updated = await deviceService.updateDevice(id, data);
      dispatch({ type: "UPDATE_DEVICE", payload: updated });
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