import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

const PAGE_CONTENT = {
  about: {
    title: "About Us",
    body: "Plantu helps you buy plants, book gardening services, and automate irrigation from one app.",
  },
  help: {
    title: "Help Center & FAQ",
    body: "For support, email help@plantu.app. FAQ: order tracking, refunds, profile setup, and device troubleshooting.",
  },
  refer: {
    title: "Refer and Earn",
    body: "Share code PLANTU10 with friends. You and your friend both get discount points in upcoming versions.",
  },
};

export default function InfoPageScreen({ route, navigation }) {
  const pageKey = route.params?.pageKey || "about";
  const content = PAGE_CONTENT[pageKey] || PAGE_CONTENT.about;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.body}>{content.body}</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Home")}> 
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: "700", color: "#243", marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 23, color: "#456", marginBottom: 20 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});