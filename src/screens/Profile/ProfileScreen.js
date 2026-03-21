import React, { useCallback, useContext, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { getMyProfile, updateMyProfile } from "../../services/profileService";
import { getApiErrorMessage } from "../../services/api";

const LOCATION_DATA = {
  India: {
    Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
    Maharashtra: ["Mumbai", "Pune", "Nagpur"],
    Delhi: ["New Delhi"],
  },
  USA: {
    California: ["San Francisco", "Los Angeles", "San Diego"],
    Texas: ["Austin", "Dallas", "Houston"],
    NewYork: ["New York City", "Buffalo"],
  },
  UAE: {
    Dubai: ["Dubai"],
    AbuDhabi: ["Abu Dhabi"],
    Sharjah: ["Sharjah"],
  },
};

const REQUIRED_KEYS = [
  "firstName",
  "lastName",
  "mobileNumber",
  "email",
  "addressLine1",
  "country",
  "stateName",
  "city",
  "pinCode",
];

function DropdownSelector({ label, value, onPress }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value || `Select ${label}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity key={option} style={styles.optionRow} onPress={() => onSelect(option)}>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen({ route, navigation }) {
  const { state, dispatch } = useContext(AuthContext);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobileNumber: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    country: "",
    stateName: "",
    city: "",
    pinCode: "",
  });
  const [pickerType, setPickerType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const forceComplete = Boolean(route.params?.requireCompletion) || !state.user?.profileCompleted;

  const loadProfile = useCallback(async (showError = false) => {
    setLoading(true);
    try {
      const profile = await getMyProfile();
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        mobileNumber: profile.mobileNumber || profile.phone || "",
        email: profile.email || "",
        addressLine1: profile.addressLine1 || "",
        addressLine2: profile.addressLine2 || "",
        addressLine3: profile.addressLine3 || "",
        country: profile.country || "",
        stateName: profile.stateName || "",
        city: profile.city || "",
        pinCode: profile.pinCode || "",
      });
    } catch (error) {
      if (showError) {
        Alert.alert("Profile", getApiErrorMessage(error, "Unable to load profile data."));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile(true);
    }, [loadProfile])
  );

  const countryOptions = useMemo(() => Object.keys(LOCATION_DATA), []);
  const stateOptions = useMemo(() => {
    if (!form.country) return [];
    return Object.keys(LOCATION_DATA[form.country]);
  }, [form.country]);
  const cityOptions = useMemo(() => {
    if (!form.country || !form.stateName) return [];
    return LOCATION_DATA[form.country][form.stateName];
  }, [form.country, form.stateName]);

  const pickerOptions =
    pickerType === "country"
      ? countryOptions
      : pickerType === "state"
      ? stateOptions
      : pickerType === "city"
      ? cityOptions
      : [];

  const pickerTitle =
    pickerType === "country"
      ? "Select Country"
      : pickerType === "state"
      ? "Select State"
      : "Select City";

  const handleSelect = (selectedValue) => {
    if (pickerType === "country") {
      setForm((prev) => ({ ...prev, country: selectedValue, stateName: "", city: "" }));
    }

    if (pickerType === "state") {
      setForm((prev) => ({ ...prev, stateName: selectedValue, city: "" }));
    }

    if (pickerType === "city") {
      setForm((prev) => ({ ...prev, city: selectedValue }));
    }

    setPickerType("");
  };

  const validateMandatoryFields = () => {
    const missing = REQUIRED_KEYS.filter((key) => !String(form[key] || "").trim());
    return missing;
  };

  const handleSaveProfile = async () => {
    const missing = validateMandatoryFields();
    if (missing.length > 0) {
      Alert.alert("Missing Details", "Please complete all required profile fields.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(form);
      dispatch({ type: "PROFILE_UPDATED", user: updated });
      Alert.alert("Profile", "Profile details saved successfully.", [
        {
          text: "OK",
          onPress: () => {
            if (forceComplete) {
              navigation.navigate("Home");
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Profile", getApiErrorMessage(error, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>
        {forceComplete && <Text style={styles.banner}>Complete profile before placing any order.</Text>}

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Name (First Name - Last Name)</Text>
          <View style={styles.row}>
            <TextInput
              value={form.firstName}
              onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
              placeholder="First Name"
              style={[styles.input, styles.halfInput, styles.halfInputSpacing]}
            />
            <TextInput
              value={form.lastName}
              onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
              placeholder="Last Name"
              style={[styles.input, styles.halfInput]}
            />
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            value={form.mobileNumber}
            onChangeText={(value) => setForm((prev) => ({ ...prev, mobileNumber: value }))}
            placeholder="Enter Mobile Number"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            value={form.email}
            onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
            placeholder="Enter E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <Text style={styles.sectionTitle}>Address</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>First Line</Text>
          <TextInput
            value={form.addressLine1}
            onChangeText={(value) => setForm((prev) => ({ ...prev, addressLine1: value }))}
            placeholder="Address Line 1"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Second Line</Text>
          <TextInput
            value={form.addressLine2}
            onChangeText={(value) => setForm((prev) => ({ ...prev, addressLine2: value }))}
            placeholder="Address Line 2"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Third Line</Text>
          <TextInput
            value={form.addressLine3}
            onChangeText={(value) => setForm((prev) => ({ ...prev, addressLine3: value }))}
            placeholder="Address Line 3"
            style={styles.input}
          />
        </View>

        <DropdownSelector label="Country" value={form.country} onPress={() => setPickerType("country")} />

        <DropdownSelector
          label="State"
          value={form.stateName}
          onPress={() => form.country && setPickerType("state")}
        />

        <DropdownSelector
          label="City"
          value={form.city}
          onPress={() => form.stateName && setPickerType("city")}
        />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Pin Code</Text>
          <TextInput
            value={form.pinCode}
            onChangeText={(value) => setForm((prev) => ({ ...prev, pinCode: value }))}
            placeholder="Enter Pin Code"
            keyboardType="number-pad"
            maxLength={10}
            style={styles.input}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={Boolean(pickerType)}
        title={pickerTitle}
        options={pickerOptions}
        onSelect={handleSelect}
        onClose={() => setPickerType("")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f4",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f3b2c",
    marginBottom: 8,
  },
  banner: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff4ce",
    color: "#5c4300",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#24462f",
    marginTop: 8,
    marginBottom: 8,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3a4f3f",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1dcd1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2b1f",
  },
  halfInput: {
    flex: 1,
  },
  halfInputSpacing: {
    marginRight: 10,
  },
  dropdown: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1dcd1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: "#1f2b1f",
  },
  placeholderText: {
    color: "#869186",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "55%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f3b2c",
    marginBottom: 10,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ee",
  },
  optionText: {
    fontSize: 16,
    color: "#263a2a",
  },
  closeButton: {
    borderRadius: 8,
    backgroundColor: "#1f8f3a",
    alignItems: "center",
    paddingVertical: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#1f8f3a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});