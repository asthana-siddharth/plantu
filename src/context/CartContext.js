import React, { useReducer } from "react";

export const CartContext = React.createContext();

const initialState = {
  items: [], // { id, product, quantity, price }
  totalPrice: 0,
  totalItems: 0,
};

const getItemKey = (payload = {}) => {
  if (payload.itemId) {
    return String(payload.itemId);
  }

  const type = payload.productType || "product";
  return `${type}-${payload.product?.id}`;
};

const getMaxQuantity = (payload = {}) => {
  if (payload.productType === "service") {
    return Number(payload.maxQuantity || 1);
  }

  const stockQty = Number(payload.maxQuantity ?? payload.product?.stockQty ?? 0);
  return Math.max(0, stockQty);
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { product, quantity, productType = "product" } = action.payload;
      const itemId = getItemKey(action.payload);
      const maxQuantity = getMaxQuantity(action.payload);
      if (maxQuantity <= 0) {
        return state;
      }

      const existingItem = state.items.find((item) => item.id === itemId);

      let updatedItems;
      if (existingItem) {
        updatedItems = state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Math.min(maxQuantity, item.quantity + quantity),
                price: product.price * Math.min(maxQuantity, item.quantity + quantity),
              }
            : item
        );
      } else {
        const safeQuantity = Math.min(Math.max(1, Number(quantity || 1)), maxQuantity);
        updatedItems = [
          ...state.items,
          {
            id: itemId,
            product,
            quantity: safeQuantity,
            price: product.price * safeQuantity,
            productType,
            maxQuantity,
          },
        ];
      }

      const totalPrice = updatedItems.reduce(
        (sum, item) => sum + item.price,
        0
      );
      const totalItems = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return { items: updatedItems, totalPrice, totalItems };
    }

    case "REMOVE_FROM_CART":
      const filteredItems = state.items.filter(
        (item) => item.id !== action.payload
      );
      const totalPrice = filteredItems.reduce(
        (sum, item) => sum + item.price,
        0
      );
      const totalItems = filteredItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      return { items: filteredItems, totalPrice, totalItems };

    case "UPDATE_QUANTITY": {
      const { itemId, quantity } = action.payload;
      const updatedItems = state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.min(Math.max(1, quantity), Math.max(1, item.maxQuantity || quantity)),
              price:
                item.product.price *
                Math.min(Math.max(1, quantity), Math.max(1, item.maxQuantity || quantity)),
            }
          : item
      );
      const newTotalPrice = updatedItems.reduce(
        (sum, item) => sum + item.price,
        0
      );
      const newTotalItems = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      return { items: updatedItems, totalPrice: newTotalPrice, totalItems: newTotalItems };
    }

    case "CLEAR_CART":
      return initialState;

    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}