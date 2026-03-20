import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { state: authState } = React.useContext(AuthContext);
  const [menuVisible, setMenuVisible] = React.useState(false);

  React.useEffect(() => {
    if (!authState?.user || authState.user.profileCompleted) {
      return;
    }

    const timer = setTimeout(() => {
      navigation.navigate("Profile", { requireCompletion: true });
    }, 450);

    return () => clearTimeout(timer);
  }, [authState?.user?.profileCompleted]);

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
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greeting}>Welcome to Plantu 🌿</Text>
            <Text style={styles.subtitle}>Grow smarter, not harder</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        </View>
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

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("OrderSummary");
              }}
            >
              <Text style={styles.menuItemText}>Order Summary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("InfoPage", { pageKey: "about" });
              }}
            >
              <Text style={styles.menuItemText}>About Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("Profile");
              }}
            >
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("InfoPage", { pageKey: "help" });
              }}
            >
              <Text style={styles.menuItemText}>Help Center & FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("InfoPage", { pageKey: "refer" });
              }}
            >
              <Text style={styles.menuItemText}>Refer and Earn</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d6e6d6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    fontSize: 20,
    color: "#355a35",
    lineHeight: 22,
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  menuPanel: {
    width: 240,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe8df",
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3f2d",
  },
});