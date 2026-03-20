import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CartContext } from "../../context/CartContext";
import { getServiceById } from "../../services/serviceCatalogService";

const CATEGORY_LABELS = {
  "gardener-visit": "Gardener Visit",
  "plant-doctor": "Plant Doctor",
};

export default function ServiceDetailScreen({ route, navigation }) {
  const { serviceId, service: prefetchedService } = route.params || {};
  const { dispatch } = useContext(CartContext);
  const [service, setService] = useState(prefetchedService || null);
  const [loading, setLoading] = useState(!prefetchedService);

  useEffect(() => {
    let isMounted = true;

    async function loadService() {
      if (!serviceId || prefetchedService) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getServiceById(serviceId);
        if (isMounted) {
          setService(response || null);
        }
      } catch (_error) {
        if (isMounted) {
          setService(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadService();
    return () => {
      isMounted = false;
    };
  }, [prefetchedService, serviceId]);

  const handleAddToCart = () => {
    if (!service) {
      return;
    }

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
          image: service.image || "🧑‍🌾",
        },
      },
    });

    Alert.alert("Added", `${service.title} added to cart`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Service details unavailable.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.heroIconWrap}>
        <Text style={styles.heroIcon}>{service.image || "🧑‍🌾"}</Text>
      </View>

      <Text style={styles.title}>{service.title}</Text>
      <Text style={styles.categoryText}>{CATEGORY_LABELS[service.category] || "Service"}</Text>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Estimated Duration</Text>
        <Text style={styles.metaValue}>{Number(service.durationMinutes || 60)} mins</Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Description</Text>
        <Text style={styles.description}>{service.description || "Service details will be updated soon."}</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.price}>₹{Math.round(Number(service.price || 0))}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddToCart}>
          <Text style={styles.primaryButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 30 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  backButton: { marginBottom: 8 },
  backButtonText: { color: "#4CAF50", fontSize: 16, fontWeight: "600" },
  heroIconWrap: {
    height: 180,
    backgroundColor: "#F7FBF7",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dfebdf",
    marginBottom: 14,
  },
  heroIcon: { fontSize: 84 },
  title: { fontSize: 26, fontWeight: "700", color: "#223", marginBottom: 4 },
  categoryText: { fontSize: 14, color: "#587", marginBottom: 14 },
  metaCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfebdf",
    backgroundColor: "#f7fbf7",
    padding: 14,
    marginBottom: 12,
  },
  metaLabel: { fontSize: 14, color: "#4a5", marginBottom: 6, fontWeight: "600" },
  metaValue: { fontSize: 20, color: "#1f6f45", fontWeight: "700" },
  description: { fontSize: 14, color: "#445", lineHeight: 20 },
  bottomRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 30, fontWeight: "800", color: "#1f6f45" },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorText: { color: "#c62828", marginBottom: 12 },
});
