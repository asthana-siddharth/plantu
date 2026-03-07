import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";

export default function OTPScreen({ route, navigation }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const { dispatch } = useContext(AuthContext);
  const { phone } = route.params;

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(timer - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter OTP");
      return;
    }

    if (otp !== "1111") {
      Alert.alert("Error", "Invalid OTP. Use 1111 for now.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with your API call
      // const response = await API.post("/auth/verify-otp", { phone, otp });
      // const token = response.data.token;

      // For now, just dispatch SIGN_IN
      setTimeout(() => {
        dispatch({
          type: "SIGN_IN",
          payload: "fake-jwt-token", // Replace with real token
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      Alert.alert("Error", "Invalid OTP");
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setTimer(60);
    setOtp("");
    // TODO: Call API to resend OTP
    Alert.alert("Success", "OTP sent to " + phone);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>We sent a code to {phone}</Text>

      <View style={styles.form}>
        <Text style={styles.label}>One-Time Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={timer > 0}
          style={styles.resendContainer}
        >
          <Text style={styles.resendText}>
            {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  backButton: {
    fontSize: 16,
    color: "#4CAF50",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  form: {
    marginVertical: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 20,
    letterSpacing: 4,
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  resendText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
});