import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import BottomTabs from "./BottomTabs";
import OrdersScreen from "../screens/Orders/OrdersScreen";
import OrderDetailsScreen from "../screens/Orders/OrderDetailsScreen";
import DummyPaymentScreen from "../screens/Cart/DummyPaymentScreen";
import InfoPageScreen from "../screens/Menu/InfoPageScreen";
import ProductDetailScreen from "../screens/Shop/ProductDetailScreen";
import ServiceDetailScreen from "../screens/Services/ServiceDetailScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="MainTabs" component={BottomTabs} />
			<Stack.Screen name="OrderSummary" component={OrdersScreen} />
			<Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
			<Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
			<Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
			<Stack.Screen name="DummyPayment" component={DummyPaymentScreen} />
			<Stack.Screen name="InfoPage" component={InfoPageScreen} />
		</Stack.Navigator>
	);
}
