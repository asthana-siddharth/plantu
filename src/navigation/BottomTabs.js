import React, { useContext } from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { CartContext } from "../context/CartContext";

import HomeScreen from "../screens/Home/HomeScreen";
import ShopScreen from "../screens/Shop/ShopScreen";
import ProductDetailScreen from "../screens/Shop/ProductDetailScreen";
import CartScreen from "../screens/Cart/CartScreen";
import OrdersScreen from "../screens/Orders/OrdersScreen";
import GardenerBookingScreen from "../screens/Services/GardenerBookingScreen";
import IrrigationControlScreen from "../screens/SmartCare/IrrigationControlScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ShopStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopList" component={ShopScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartList" component={CartScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
    </Stack.Navigator>
  );
}

export default function BottomTabs() {
  const { state } = useContext(CartContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopStack}
        options={{
          tabBarLabel: "Shop",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛍️</Text>,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartStack}
        options={{
          tabBarLabel: "Cart",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛒</Text>,
          tabBarBadge: state.totalItems > 0 ? state.totalItems : null,
        }}
      />
      <Tab.Screen
        name="Services"
        component={GardenerBookingScreen}
        options={{
          tabBarLabel: "Services",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👨‍🌾</Text>,
        }}
      />
      <Tab.Screen
        name="SmartCare"
        component={IrrigationControlScreen}
        options={{
          tabBarLabel: "SmartCare",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💧</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}