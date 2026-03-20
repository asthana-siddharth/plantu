import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { cancelOrder, getOrderById } from "../../services/orderService";

function normalizeLineItem(rawItem = {}, index = 0) {
  const type = String(rawItem.type || "product").toLowerCase();
  const normalizedId = rawItem.id != null ? rawItem.id : `line-${index}`;

  return {
    id: normalizedId,
    type: type === "service" ? "service" : "product",
    name: rawItem.name || "Item",
    quantity: Number(rawItem.quantity || 1),
    lineTotal: Number(rawItem.lineTotal || 0),
  };
}

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId, order: prefetchedOrder } = route.params || {};
  const [order, setOrder] = useState(prefetchedOrder || null);
  const [loading, setLoading] = useState(!prefetchedOrder);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!orderId) {
        setError("Order not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getOrderById(orderId);
        if (isMounted) {
          setOrder(response);
          setError("");
        }
      } catch (_error) {
        if (isMounted) {
          setError("Failed to fetch order details");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (!prefetchedOrder) {
      loadOrder();
    }

    return () => {
      isMounted = false;
    };
  }, [orderId, prefetchedOrder]);

  const lineItems = useMemo(() => {
    if (Array.isArray(order?.order_items) && order.order_items.length) {
      return order.order_items.map((item, index) => normalizeLineItem(item, index));
    }

    return (order?.items_list || []).map((name, index) =>
      normalizeLineItem(
        {
          id: `line-${index}`,
          type: "product",
          name,
          quantity: 1,
          lineTotal: 0,
        },
        index
      )
    );
  }, [order]);

  const productItems = useMemo(() => lineItems.filter((item) => item.type === "product"), [lineItems]);
  const serviceItems = useMemo(() => lineItems.filter((item) => item.type === "service"), [lineItems]);

  const openLineItemDetails = (item) => {
    if (item.type === "service") {
      navigation.navigate("ServiceDetail", {
        serviceId: Number(item.id),
      });
      return;
    }

    navigation.navigate("ProductDetail", {
      productId: Number(item.id),
    });
  };

  const canCancelOrder = String(order?.status || "").trim() === "Placed";

  async function handleCancelOrder() {
    if (!order?.id || !canCancelOrder || cancelling) {
      return;
    }

    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      Alert.alert("Order", "Order cancelled successfully.");
    } catch (cancelError) {
      Alert.alert("Order", cancelError?.response?.data?.message || "Unable to cancel this order.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Order unavailable"}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("OrderSummary")}>
          <Text style={styles.primaryButtonText}>Back to Order Summary</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order Details</Text>
      <View style={styles.card}>
        <Text style={styles.orderId}>{order.id}</Text>
        <Text style={styles.meta}>Date: {order.date}</Text>
        <Text style={styles.meta}>Status: {order.status}</Text>
        <Text style={styles.meta}>Payment: {order.payment_status || "paid"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Products</Text>
        {productItems.length === 0 && <Text style={styles.emptyHint}>No products in this order.</Text>}
        {productItems.map((item, index) => (
          <TouchableOpacity
            key={`product-${item.id || index}`}
            style={styles.itemRow}
            onPress={() => openLineItemDetails(item)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>Qty: {item.quantity || 1} • Tap for details</Text>
            </View>
            <Text style={styles.itemPrice}>₹{Math.round(Number(item.lineTotal || 0))}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>
        {serviceItems.length === 0 && <Text style={styles.emptyHint}>No services in this order.</Text>}
        {serviceItems.map((item, index) => (
          <TouchableOpacity
            key={`service-${item.id || index}`}
            style={styles.itemRow}
            onPress={() => openLineItemDetails(item)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>Qty: {item.quantity || 1} • Tap for details</Text>
            </View>
            <Text style={styles.itemPrice}>₹{Math.round(Number(item.lineTotal || 0))}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalMeta}>₹{Math.round(Number(order.subtotal ?? order.total ?? 0))}</Text>
        <Text style={styles.totalLabel}>Tax</Text>
        <Text style={styles.totalMeta}>₹{Math.round(Number(order.taxTotal || 0))}</Text>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={styles.totalValue}>₹{Math.round(Number(order.total || 0))}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("OrderSummary")}>
        <Text style={styles.primaryButtonText}>Go to Order Summary</Text>
      </TouchableOpacity>

      {canCancelOrder && (
        <TouchableOpacity
          style={[styles.primaryButton, styles.cancelButton]}
          onPress={handleCancelOrder}
          disabled={cancelling}
        >
          <Text style={styles.primaryButtonText}>{cancelling ? "Cancelling..." : "Cancel Order"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#223", marginBottom: 14 },
  card: {
    backgroundColor: "#F6FAF6",
    borderWidth: 1,
    borderColor: "#E0ECE0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  orderId: { fontSize: 20, fontWeight: "700", color: "#1f3d21", marginBottom: 8 },
  meta: { fontSize: 14, color: "#456" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2b3f2d", marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#334" },
  itemMeta: { fontSize: 12, color: "#7a8" },
  itemPrice: { fontSize: 14, fontWeight: "700", color: "#1f6f45" },
  emptyHint: { fontSize: 13, color: "#758", paddingVertical: 4 },
  totalLabel: { fontSize: 14, color: "#556" },
  totalMeta: { fontSize: 16, fontWeight: "700", color: "#2f5f4a", marginBottom: 6 },
  totalValue: { fontSize: 26, fontWeight: "800", color: "#1f6f45", marginTop: 3 },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: "#C62828",
    marginTop: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#d32f2f", marginBottom: 12 },
});