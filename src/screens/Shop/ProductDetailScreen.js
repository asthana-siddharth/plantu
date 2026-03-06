// filepath: src/screens/Shop/ProductDetailScreen.js
import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CartContext } from "../../context/CartContext";

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const { dispatch } = useContext(CartContext);

  const handleAddToCart = () => {
    setAddingToCart(true);
    setTimeout(() => {
      dispatch({
        type: "ADD_TO_CART",
        payload: { product, quantity },
      });
      Alert.alert(
        "Success",
        `${quantity} ${product.name} added to cart`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      setAddingToCart(false);
    }, 500);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Text style={styles.image}>{product.image}</Text>
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.productName}>{product.name}</Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {product.rating} (128 reviews)</Text>
        </View>

        {/* Price */}
        <Text style={styles.price}>₹{product.price}</Text>

        {/* Stock Status */}
        <View
          style={[
            styles.stockStatus,
            { backgroundColor: product.inStock ? "#E8F5E9" : "#FFEBEE" },
          ]}
        >
          <Text
            style={[
              styles.stockText,
              { color: product.inStock ? "#2E7D32" : "#C62828" },
            ]}
          >
            {product.inStock ? "✓ In Stock" : "Out of Stock"}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About this product</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Key Features</Text>
          <View style={styles.feature}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>High quality material</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Free shipping on orders above ₹500
            </Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              30 days money-back guarantee
            </Text>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => setQuantity(quantity + 1)}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            !product.inStock && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={!product.inStock || addingToCart}
        >
          <Text style={styles.addToCartText}>
            {addingToCart ? "Adding..." : "Add to Cart"}
          </Text>
        </TouchableOpacity>

        {/* Shipping Info */}
        <View style={styles.shippingInfo}>
          <Text style={styles.shippingLabel}>
            📦 Free shipping to your location
          </Text>
          <Text style={styles.shippingLabel}>
            🚚 Delivery in 2-3 business days
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  imageContainer: {
    height: 280,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    fontSize: 120,
  },
  infoContainer: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  rating: {
    fontSize: 14,
    color: "#FFA500",
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 12,
  },
  stockStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  feature: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  featureBullet: {
    fontSize: 16,
    color: "#4CAF50",
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    width: 120,
  },
  quantityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  quantityValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  addToCartButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#ccc",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  shippingInfo: {
    backgroundColor: "#F0F8F0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  shippingLabel: {
    fontSize: 12,
    color: "#2E7D32",
    marginBottom: 6,
  },
});