import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";

export default function OrdersScreen() {
  const [orders] = useState([
    {
      id: "ORD001",
      date: "March 5, 2026",
      status: "Delivered",
      items: 3,
      total: 1299,
      items_list: ["Monstera Deliciosa", "Ceramic Pot 6inch", "Snake Plant"],
    },
    {
      id: "ORD002",
      date: "February 28, 2026",
      status: "Shipped",
      items: 2,
      total: 648,
      items_list: ["Tomato Seeds", "Garden Pruner"],
    },
    {
      id: "ORD003",
      date: "February 20, 2026",
      status: "Processing",
      items: 1,
      total: 599,
      items_list: ["Pothos Plant"],
    },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "#4CAF50";
      case "Shipped":
        return "#2196F3";
      case "Processing":
        return "#FF9800";
      case "Cancelled":
        return "#F44336";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
        return "✓";
      case "Shipped":
        return "📦";
      case "Processing":
        return "⏳";
      case "Cancelled":
        return "✕";
      default:
        return "•";
    }
  };

  const OrderCard = ({ order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order {order.id}</Text>
          <Text style={styles.orderDate}>{order.date}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Text style={styles.statusIcon}>
            {getStatusIcon(order.status)}
          </Text>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View>
          <Text style={styles.label}>Items</Text>
          <Text style={styles.value}>{order.items}</Text>
        </View>
        <View>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.value}>₹{order.total}</Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {order.items_list.map((item, idx) => (
          <Text key={idx} style={styles.itemText}>
            • {item}
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.viewButton}>
        <Text style={styles.viewButtonText}>View Details →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.orderCount}>
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </Text>
      </View>

      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderCard order={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  orderCount: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  orderCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    flexDirection: "row",
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  orderDetails: {
    flexDirection: "row",
    gap: 20,
    marginVertical: 12,
  },
  itemsList: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  itemText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  viewButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
});
