import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { DeviceContext } from "../../context/DeviceContext";

export default function IrrigationControlScreen() {
  const { devices, loading, toggleDevice } = useContext(DeviceContext);

  const renderItem = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.moisture}>Moisture: {item.moisture}%</Text>
        {item.lastSeen && (
          <Text style={styles.lastSeen}>
            Last update: {new Date(item.lastSeen).toLocaleTimeString()}
          </Text>
        )}
      </View>

      <Switch
        value={item.isOn}
        onValueChange={(val) => toggleDevice(item.id, val)}
        trackColor={{ true: "#4CAF50" }}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (devices.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No irrigation devices found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={devices}
      keyExtractor={(d) => d.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#999", fontSize: 16 },
  deviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  moisture: { fontSize: 14, color: "#666", marginTop: 4 },
  lastSeen: { fontSize: 12, color: "#999", marginTop: 2 },
});