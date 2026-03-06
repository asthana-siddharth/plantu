import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function HomeScreen() {
  const navigation = useNavigation();

  const features = [
    {
      id: 1,
      title: "🌱 Plant Shop",
      subtitle: "Buy plants & pots",
      color: "#E8F5E9",
    },
    {
      id: 2,
      title: "👨‍🌾 Gardener Services",
      subtitle: "Book expert help",
      color: "#FFF3E0",
    },
    {
      id: 3,
      title: "💧 Smart Irrigation",
      subtitle: "Control watering",
      color: "#E1F5FE",
    },
  ];

  const handleFeaturePress = (id) => {
    switch (id) {
      case 1:
        navigation.navigate("Shop");
        break;
      case 2:
        navigation.navigate("Services");
        break;
      case 3:
        navigation.navigate("SmartCare");
        break;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to Plantu 🌿</Text>
        <Text style={styles.subtitle}>Grow smarter, not harder</Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresContainer}>
        {features.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={[styles.featureCard, { backgroundColor: feature.color }]}
            onPress={() => handleFeaturePress(feature.id)}
          >
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Garden</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Plants</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>Booking</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => navigation.navigate("Shop")}
      >
        <Text style={styles.ctaText}>Browse Plants Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  featureCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  featureSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  arrow: {
    fontSize: 20,
    color: "#4CAF50",
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  ctaButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});