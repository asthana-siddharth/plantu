import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createOrder } from "../../services/orderService";
import { CartContext } from "../../context/CartContext";
import { getApiErrorMessage } from "../../services/api";

export default function DummyPaymentScreen({ route, navigation }) {
  const { dispatch } = React.useContext(CartContext);
  const [processing, setProcessing] = useState(false);
  const { cartItems = [], payable = 0, summary, deliveryMode = "pickup" } = route.params || {};

  const handleConfirmPayment = async () => {
    if (!cartItems.length) {
      Alert.alert("Cart Empty", "Please add items before payment.");
      return;
    }

    setProcessing(true);
    try {
      const order = await createOrder(cartItems, { deliveryMode });
      dispatch({ type: "CLEAR_CART" });

      navigation.replace("OrderDetails", { orderId: order.id, order });
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to confirm payment.");
      if (message.toLowerCase().includes("complete profile")) {
        Alert.alert("Payment Failed", message, [
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("Profile"),
          },
          { text: "OK" },
        ]);
      } else {
        Alert.alert("Payment Failed", message);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dummy Payment</Text>
      <Text style={styles.subtitle}>Use this screen to simulate payment confirmation.</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Amount Payable</Text>
        <Text style={styles.amount}>₹{Math.round(Number(payable || 0))}</Text>
        {summary ? (
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLine}>Subtotal: ₹{Math.round(Number(summary.subtotal || 0))}</Text>
            {summary.hasItemProducts ? (
              <Text style={styles.summaryLine}>
                SGST on Item ({Number(summary.itemSgstPercent || 0)}%): ₹{Math.round(Number(summary.itemSgst || 0))}
              </Text>
            ) : null}
            {summary.hasItemProducts ? (
              <Text style={styles.summaryLine}>
                CGST on Item ({Number(summary.itemCgstPercent || 0)}%): ₹{Math.round(Number(summary.itemCgst || 0))}
              </Text>
            ) : null}
            {summary.hasServiceProducts ? (
              <Text style={styles.summaryLine}>
                SGST on Service ({Number(summary.serviceSgstPercent || 0)}%): ₹{Math.round(Number(summary.serviceSgst || 0))}
              </Text>
            ) : null}
            {summary.hasServiceProducts ? (
              <Text style={styles.summaryLine}>
                CGST on Service ({Number(summary.serviceCgstPercent || 0)}%): ₹{Math.round(Number(summary.serviceCgst || 0))}
              </Text>
            ) : null}
            <Text style={styles.summaryLine}>
              Platform Fee: ₹{Math.round(Number(summary.platformFee || 0))}
            </Text>
            {deliveryMode === "delivery" ? (
              <Text style={styles.summaryLine}>
                Transportation Fee ({deliveryMode}): ₹{Math.round(Number(summary.transportationFee || 0))}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, processing && styles.disabledButton]}
        onPress={handleConfirmPayment}
        disabled={processing}
      >
        <Text style={styles.primaryButtonText}>
          {processing ? "Processing..." : "Confirm Dummy Payment"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Back to Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#223",
    marginBottom: 8,
  },
  subtitle: {
    color: "#667",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E3ECE3",
    borderRadius: 12,
    backgroundColor: "#F6FAF6",
    padding: 16,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 14,
    color: "#678",
  },
  amount: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: "800",
    color: "#1f6f45",
  },
  summaryBlock: {
    marginTop: 8,
  },
  summaryLine: {
    color: "#5f6f6f",
    fontSize: 13,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
});