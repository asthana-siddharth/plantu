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
import { AuthContext } from "../../context/AuthContext";
import { getTaxConfig } from "../../services/taxService";

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function isServiceItem(item) {
  if (String(item?.productType || "").toLowerCase() === "service") {
    return true;
  }
  return String(item?.id || "").toLowerCase().startsWith("service-");
}

function getDisplayImage(product = {}, isService = false) {
  if (isService) {
    return product.image || "🧑‍🌾";
  }

  const imageMap = {
    plant: "🌿",
    pot: "🏺",
    seed: "🌱",
    tool: "✂️",
  };

  const normalized = String(product.image || "").trim().toLowerCase();
  return imageMap[normalized] || product.image || "📦";
}

export default function CartScreen({ navigation }) {
  const { state, dispatch } = useContext(CartContext);
  const { state: authState } = useContext(AuthContext);
  const [deliveryMode, setDeliveryMode] = React.useState("pickup");
  const [taxConfig, setTaxConfig] = React.useState({
    itemSgstPercent: 0,
    itemCgstPercent: 0,
    serviceSgstPercent: 0,
    serviceCgstPercent: 0,
    itemTaxPercent: 0,
    serviceTaxPercent: 0,
    platformFee: 0,
    transportationFee: 100,
  });

  React.useEffect(() => {
    let isMounted = true;
    async function loadTaxConfig() {
      try {
        const config = await getTaxConfig();
        if (isMounted) {
          setTaxConfig({
            itemSgstPercent: Number(config.itemSgstPercent || 0),
            itemCgstPercent: Number(config.itemCgstPercent || 0),
            serviceSgstPercent: Number(config.serviceSgstPercent || 0),
            serviceCgstPercent: Number(config.serviceCgstPercent || 0),
            itemTaxPercent: Number(config.itemTaxPercent || 0),
            serviceTaxPercent: Number(config.serviceTaxPercent || 0),
            platformFee: Number(config.platformFee || 0),
            transportationFee: Number(config.transportationFee || 100),
          });
        }
      } catch (_error) {
        if (isMounted) {
          setTaxConfig({
            itemSgstPercent: 0,
            itemCgstPercent: 0,
            serviceSgstPercent: 0,
            serviceCgstPercent: 0,
            itemTaxPercent: 0,
            serviceTaxPercent: 0,
            platformFee: 0,
            transportationFee: 100,
          });
        }
      }
    }

    loadTaxConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const summary = React.useMemo(() => {
    const itemSubtotal = state.items
      .filter((item) => !isServiceItem(item))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);

    const serviceSubtotal = state.items
      .filter((item) => isServiceItem(item))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);

    const hasItemProducts = state.items.some((item) => !isServiceItem(item));
    const hasServiceProducts = state.items.some((item) => isServiceItem(item));

    const itemSgst = roundMoney((itemSubtotal * Number(taxConfig.itemSgstPercent || 0)) / 100);
    const itemCgst = roundMoney((itemSubtotal * Number(taxConfig.itemCgstPercent || 0)) / 100);
    const serviceSgst = roundMoney((serviceSubtotal * Number(taxConfig.serviceSgstPercent || 0)) / 100);
    const serviceCgst = roundMoney((serviceSubtotal * Number(taxConfig.serviceCgstPercent || 0)) / 100);
    const itemTax = roundMoney(itemSgst + itemCgst);
    const serviceTax = roundMoney(serviceSgst + serviceCgst);
    const subtotal = roundMoney(itemSubtotal + serviceSubtotal);
    const taxTotal = roundMoney(itemTax + serviceTax);
    const platformFee = roundMoney(Number(taxConfig.platformFee || 0));
    const transportationFee = deliveryMode === "delivery"
      ? roundMoney(Number(taxConfig.transportationFee || 0))
      : 0;
    const total = roundMoney(subtotal + taxTotal + platformFee + transportationFee);

    return {
      subtotal,
      itemSubtotal,
      serviceSubtotal,
      hasItemProducts,
      hasServiceProducts,
      itemSgst,
      itemCgst,
      serviceSgst,
      serviceCgst,
      itemTax,
      serviceTax,
      platformFee,
      transportationFee,
      taxTotal,
      total,
      itemSgstPercent: Number(taxConfig.itemSgstPercent || 0),
      itemCgstPercent: Number(taxConfig.itemCgstPercent || 0),
      serviceSgstPercent: Number(taxConfig.serviceSgstPercent || 0),
      serviceCgstPercent: Number(taxConfig.serviceCgstPercent || 0),
    };
  }, [state.items, taxConfig, deliveryMode]);

  const orderedItems = React.useMemo(() => {
    const products = state.items.filter((item) => !isServiceItem(item));
    const services = state.items.filter((item) => isServiceItem(item));
    return [...products, ...services];
  }, [state.items]);

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

    if (!authState.user?.profileCompleted) {
      Alert.alert("Complete Profile", "Please complete your profile before placing an order.", [
        {
          text: "Go to Profile",
          onPress: () => navigation.navigate("Profile", { requireCompletion: true }),
        },
      ]);
      return;
    }

    navigation.navigate("DummyPayment", {
      cartItems: state.items,
      payable: summary.total,
      summary,
      deliveryMode,
    });
  };

  const CartItem = ({ item }) => (
    (() => {
      const serviceItem = isServiceItem(item);
      return (
    <View style={styles.cartItem}>
      <View style={styles.itemImage}>
        <Text style={styles.image}>{getDisplayImage(item.product, serviceItem)}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>₹{item.product.price}</Text>
        {serviceItem && <Text style={styles.serviceTag}>Service</Text>}
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
            disabled={item.quantity >= (item.maxQuantity || 1)}
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
    })()
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
        data={orderedItems}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{Math.round(summary.subtotal)}</Text>
            </View>
            {summary.hasItemProducts ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST on Item ({summary.itemSgstPercent}%)</Text>
                <Text style={styles.summaryValue}>₹{Math.round(summary.itemSgst)}</Text>
              </View>
            ) : null}
            {summary.hasItemProducts ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST on Item ({summary.itemCgstPercent}%)</Text>
                <Text style={styles.summaryValue}>₹{Math.round(summary.itemCgst)}</Text>
              </View>
            ) : null}
            {summary.hasServiceProducts ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST on Service ({summary.serviceSgstPercent}%)</Text>
                <Text style={styles.summaryValue}>₹{Math.round(summary.serviceSgst)}</Text>
              </View>
            ) : null}
            {summary.hasServiceProducts ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST on Service ({summary.serviceCgstPercent}%)</Text>
                <Text style={styles.summaryValue}>₹{Math.round(summary.serviceCgst)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>₹{Math.round(summary.platformFee)}</Text>
            </View>
            <View style={styles.deliveryToggleRow}>
              <Text style={styles.summaryLabel}>Order Fulfilment</Text>
              <View style={styles.deliveryToggleGroup}>
                <TouchableOpacity
                  style={[styles.modeChip, deliveryMode === "pickup" && styles.modeChipActive]}
                  onPress={() => setDeliveryMode("pickup")}
                >
                  <Text style={[styles.modeChipText, deliveryMode === "pickup" && styles.modeChipTextActive]}>Pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeChip, deliveryMode === "delivery" && styles.modeChipActive]}
                  onPress={() => setDeliveryMode("delivery")}
                >
                  <Text style={[styles.modeChipText, deliveryMode === "delivery" && styles.modeChipTextActive]}>Delivery</Text>
                </TouchableOpacity>
              </View>
            </View>
            {deliveryMode === "delivery" ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Transportation Fee</Text>
                <Text style={styles.summaryValue}>₹{Math.round(summary.transportationFee)}</Text>
              </View>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{Math.round(summary.total)}</Text>
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
        }
      />
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
    fontSize: 34,
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
  serviceTag: {
    color: "#5E35B1",
    fontSize: 11,
    marginBottom: 8,
    fontWeight: "600",
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
  deliveryToggleRow: {
    marginBottom: 12,
  },
  deliveryToggleGroup: {
    flexDirection: "row",
    marginTop: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: "#cfd8cf",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  modeChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#355a35",
  },
  modeChipTextActive: {
    color: "#fff",
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
