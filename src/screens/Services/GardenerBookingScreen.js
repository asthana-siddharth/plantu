import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const SERVICES = [
  { id: "balcony", title: "Balcony Garden", price: 499 },
  { id: "villa", title: "Villa / Lawn", price: 899 },
  { id: "office", title: "Office Space", price: 699 },
];

export default function GardenerBookingScreen() {
  const [selectedService, setSelectedService] = useState(SERVICES[0].id);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBook = () => {
    setLoading(true);
    // TODO: replace with real API call
    setTimeout(() => {
      Alert.alert(
        "Booked",
        `Your ${SERVICES.find((s) => s.id === selectedService).title} service is confirmed for ${date.toLocaleString()}.`
      );
      setLoading(false);
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>Book Gardener Service</Text>

      <Text style={styles.label}>Service type</Text>
      {SERVICES.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={[
            styles.option,
            selectedService === service.id && styles.optionActive,
          ]}
          onPress={() => setSelectedService(service.id)}
        >
          <Text
            style={[
              styles.optionText,
              selectedService === service.id && styles.optionTextActive,
            ]}
          >
            {service.title} – ₹{service.price}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Preferred date & time</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.dateText}>{date.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(e, selected) => {
            setShowPicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      <Text style={styles.label}>Additional notes</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. bring tools, focus on pruning"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity
        style={[styles.bookButton, loading && styles.bookButtonDisabled]}
        onPress={handleBook}
        disabled={loading}
      >
        <Text style={styles.bookButtonText}>
          {loading ? "Booking…" : "Confirm Booking"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
    color: "#555",
  },
  option: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  optionActive: { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
  optionText: { fontSize: 16, color: "#333" },
  optionTextActive: { color: "#4CAF50", fontWeight: "600" },
  dateButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  bookButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30,
  },
  bookButtonDisabled: {
    backgroundColor: "#ccc",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});