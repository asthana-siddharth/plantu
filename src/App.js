import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { DeviceProvider } from "./context/DeviceContext";
import RootNavigator from "./navigation/RootNavigator";
import { setAuthToken } from "./services/api";
import AppSplashScreen from "./components/AppSplashScreen";

const AUTH_STORAGE_KEY = "plantu.auth.token";
const AUTH_USER_STORAGE_KEY = "plantu.auth.user";

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case "RESTORE_TOKEN":
          return {
            ...prevState,
            userToken: action.payload,
            user: action.user || null,
            isLoading: false,
          };
        case "SIGN_IN":
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload,
            user: action.user || prevState.user,
          };
        case "PROFILE_UPDATED":
          return {
            ...prevState,
            user: action.user,
          };
        case "SIGN_OUT":
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
            user: null,
          };
        default:
          return prevState;
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
      user: null,
    }
  );

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function restoreAuth() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEY),
          AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
        ]);

        if (!isMounted) {
          return;
        }

        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        dispatch({
          type: "RESTORE_TOKEN",
          payload: storedToken,
          user: parsedUser,
        });
      } catch (_error) {
        if (isMounted) {
          dispatch({ type: "RESTORE_TOKEN", payload: null, user: null });
        }
      }
    }

    restoreAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    setAuthToken(state.userToken);
    async function syncStorage() {
      if (state.userToken) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, state.userToken);
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }

      if (state.user) {
        await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(state.user));
      } else {
        await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
    }

    syncStorage().catch(() => null);
  }, [state.userToken, state.user]);

  return (
    showSplash ? (
      <AppSplashScreen />
    ) : (
      <AuthContext.Provider value={{ state, dispatch }}>
        <CartProvider>
          <DeviceProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </DeviceProvider>
        </CartProvider>
      </AuthContext.Provider>
    )
  );
}