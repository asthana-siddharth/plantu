import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CartContext } from "../../context/CartContext";
import { getServices } from "../../services/serviceCatalogService";
import { getApiErrorMessage } from "../../services/api";

export default function GardenerBookingScreen({ navigation }) {
  const { dispatch } = useContext(CartContext);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadServices(showPrompt = true) {
    setLoading(true);
    setLoadError("");
    try {
      const response = await getServices();
      setServices(response);
    } catch (error) {
      setServices([]);
      const message = getApiErrorMessage(error, "Failed to load services.");
      setLoadError(message);
      if (showPrompt) {
        Alert.alert("Services", message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  const handleAddService = (service) => {
    dispatch({
      type: "ADD_TO_CART",
      payload: {
        itemId: `service-${service.id}`,
        productType: "service",
        maxQuantity: 1,
        quantity: 1,
        product: {
          id: service.id,
          name: service.title,
          price: Number(service.price),
          image: "🧑‍🌾",
        },
      },
    });

    Alert.alert("Added", `${service.title} added to cart`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>Gardener Services</Text>
      <Text style={styles.caption}>Pick a service and add it to cart to purchase.</Text>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadServices(false)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {services.map((service) => (
        <View key={service.id} style={styles.card}>
          <Text style={styles.title}>{service.title}</Text>
          <Text style={styles.description}>{service.description}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.price}>₹{service.price}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("ServiceDetail", { serviceId: service.id, service })}
              >
                <Text style={styles.secondaryButtonText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookButton} onPress={() => handleAddService(service)}>
                <Text style={styles.bookButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#333",
  },
  caption: {
    fontSize: 14,
    color: "#667",
    marginBottom: 14,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#f3c9c9",
    backgroundColor: "#fff4f4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#8f2c2c",
    fontSize: 13,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#c64f4f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  retryButtonText: {
    color: "#8f2c2c",
    fontWeight: "600",
    fontSize: 12,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe9df",
    marginBottom: 10,
    backgroundColor: "#f7fbf7",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#233",
  },
  description: {
    fontSize: 13,
    color: "#667",
    marginTop: 6,
  },
  bottomRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#2f7d32",
    fontSize: 13,
    fontWeight: "600",
  },
  price: { fontSize: 18, fontWeight: "700", color: "#1f6f45" },
  bookButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});