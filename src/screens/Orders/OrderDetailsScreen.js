import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOrderById } from "../../services/orderService";

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId, order: prefetchedOrder } = route.params || {};
  const [order, setOrder] = useState(prefetchedOrder || null);
  const [loading, setLoading] = useState(!prefetchedOrder);
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
      return order.order_items;
    }

    return (order?.items_list || []).map((name, index) => ({
      id: `line-${index}`,
      name,
      quantity: 1,
      lineTotal: 0,
    }));
  }, [order]);

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
        <Text style={styles.sectionTitle}>Items</Text>
        {lineItems.map((item, index) => (
          <View key={item.id || index} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>Qty: {item.quantity || 1}</Text>
            </View>
            <Text style={styles.itemPrice}>₹{Math.round(Number(item.lineTotal || 0))}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={styles.totalValue}>₹{Math.round(Number(order.total || 0))}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("OrderSummary")}>
        <Text style={styles.primaryButtonText}>Go to Order Summary</Text>
      </TouchableOpacity>
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
  totalLabel: { fontSize: 14, color: "#556" },
  totalValue: { fontSize: 26, fontWeight: "800", color: "#1f6f45", marginTop: 3 },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#d32f2f", marginBottom: 12 },
});