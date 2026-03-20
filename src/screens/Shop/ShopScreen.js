import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getProducts } from "../../services/productService";
import { CartContext } from "../../context/CartContext";

export default function ShopScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useContext(CartContext);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All" },
    { id: "plants", name: "Plants" },
    { id: "pots", name: "Pots" },
    { id: "seeds", name: "Seeds" },
    { id: "tools", name: "Tools" },
  ];

  const getProductEmoji = (item) => {
    const imageMap = {
      plant: "🌿",
      pot: "🏺",
      seed: "🌱",
      tool: "✂️",
    };

    return imageMap[item.image] || "🌿";
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await getProducts();
        setProducts(response);
        setFilteredProducts(response);
      } catch (error) {
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const cartQuantityMap = React.useMemo(() => {
    const nextMap = {};
    state.items.forEach((item) => {
      nextMap[item.id] = item.quantity;
    });
    return nextMap;
  }, [state.items]);

  const filterProducts = () => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const ProductCard = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        navigation.navigate("ProductDetail", { product: item })
      }
    >
      <View style={styles.imageContainer}>
        <Text style={styles.productImage}>{getProductEmoji(item)}</Text>
        {!item.inStock && <View style={styles.outOfStockOverlay} />}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.price}</Text>
          <View style={styles.quantityBox}>
            <TouchableOpacity
              style={styles.quantityAction}
              disabled={!item.inStock || !cartQuantityMap[`product-${item.id}`]}
              onPress={(event) => {
                event?.stopPropagation?.();

                const currentQty = Number(cartQuantityMap[`product-${item.id}`] || 0);
                if (currentQty <= 1) {
                  dispatch({ type: "REMOVE_FROM_CART", payload: `product-${item.id}` });
                  return;
                }

                dispatch({
                  type: "UPDATE_QUANTITY",
                  payload: {
                    itemId: `product-${item.id}`,
                    quantity: currentQty - 1,
                  },
                });
              }}
            >
              <Text style={styles.quantityActionText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.quantityValue}>{cartQuantityMap[`product-${item.id}`] || 0}</Text>

            <TouchableOpacity
              style={styles.quantityAction}
              disabled={!item.inStock}
              onPress={(event) => {
                event?.stopPropagation?.();

                const currentQty = Number(cartQuantityMap[`product-${item.id}`] || 0);
                if (currentQty >= Number(item.stockQty || 0)) {
                  Alert.alert("Stock limit", `Only ${item.stockQty} units are available`);
                  return;
                }

                dispatch({
                  type: "ADD_TO_CART",
                  payload: {
                    itemId: `product-${item.id}`,
                    product: item,
                    quantity: 1,
                    productType: "product",
                    maxQuantity: item.stockQty,
                  },
                });
              }}
            >
              <Text style={styles.quantityActionText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.stockText}>Available: {item.stockQty || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plant Shop</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search plants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              selectedCategory === cat.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductCard item={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.productsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  searchIcon: {
    fontSize: 18,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
  },
  categoryTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  productsList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginHorizontal: 5,
    marginVertical: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  imageContainer: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  productImage: {
    fontSize: 60,
  },
  outOfStockOverlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  ratingContainer: {
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    color: "#FFA500",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  quantityBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c7dfc7",
    borderRadius: 8,
  },
  quantityAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityActionText: {
    color: "#1f6f45",
    fontWeight: "700",
    fontSize: 16,
  },
  quantityValue: {
    minWidth: 18,
    textAlign: "center",
    fontWeight: "700",
    color: "#234",
  },
  stockText: {
    marginTop: 8,
    fontSize: 12,
    color: "#687",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});