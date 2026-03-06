import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthContext } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { DeviceProvider } from "./context/DeviceContext";
import RootNavigator from "./navigation/RootNavigator";

export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case "RESTORE_TOKEN":
          return {
            ...prevState,
            userToken: action.payload,
            isLoading: false,
          };
        case "SIGN_IN":
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload,
          };
        case "SIGN_OUT":
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      <CartProvider>
        <DeviceProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </DeviceProvider>
      </CartProvider>
    </AuthContext.Provider>
  );
}