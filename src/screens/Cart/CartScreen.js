import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { CartContext } from "../../context/CartContext";
import { createOrder } from "../../services/orderService";

export default function CartScreen({ navigation }) {
  const { state, dispatch } = useContext(CartContext);

  const handleRemoveItem = (itemId) => {
    Alert.alert("Remove Item", "Are you sure?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Remove",
        onPress: () => dispatch({ type: "REMOVE_FROM_CART", payload: itemId }),
      },
    ]);
  };

  const handleCheckout = async () => {
    if (state.items.length === 0) {
      Alert.alert("Empty Cart", "Please add items before checkout");
      return;
    }

    try {
      await createOrder(state.items);
      Alert.alert("Order Placed", "Your order has been confirmed!", [
        {
          text: "OK",
          onPress: () => {
            dispatch({ type: "CLEAR_CART" });
            navigation.navigate("Orders");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to place order. Please try again.");
    }
  };

  const CartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImage}>
        <Text style={styles.image}>{item.product.image}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>₹{item.product.price}</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            onPress={() =>
              dispatch({
                type: "UPDATE_QUANTITY",
                payload: { itemId: item.id, quantity: Math.max(1, item.quantity - 1) },
              })
            }
          >
            <Text style={styles.quantityButton}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() =>
              dispatch({
                type: "UPDATE_QUANTITY",
                payload: { itemId: item.id, quantity: item.quantity + 1 },
              })
            }
          >
            <Text style={styles.quantityButton}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemActions}>
        <Text style={styles.subtotal}>₹{item.price}</Text>
        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
          <Text style={styles.removeButton}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (state.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>
          Add some plants to get started!
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("Shop")}
        >
          <Text style={styles.browseButtonText}>Browse Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.itemCount}>
          {state.totalItems} {state.totalItems === 1 ? "item" : "items"}
        </Text>
      </View>

      <FlatList
        data={state.items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      {/* Order Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{state.totalPrice}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>FREE</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (18%)</Text>
          <Text style={styles.summaryValue}>
            ₹{Math.round(state.totalPrice * 0.18)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ₹{Math.round(state.totalPrice * 1.18)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueShopping}
          onPress={() => navigation.navigate("Shop")}
        >
          <Text style={styles.continueShoppingText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  itemCount: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  image: {
    fontSize: 40,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    width: 80,
  },
  quantityButton: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  quantityText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  itemActions: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  subtotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  removeButton: {
    fontSize: 18,
    color: "#FF5252",
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  checkoutButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  continueShopping: {
    paddingVertical: 12,
    marginTop: 12,
    alignItems: "center",
  },
  continueShoppingText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
});
