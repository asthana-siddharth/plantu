import React, { useReducer } from "react";

export const CartContext = React.createContext();

const initialState = {
  items: [], // { id, product, quantity, price }
  totalPrice: 0,
  totalItems: 0,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === product.id);

      let updatedItems;
      if (existingItem) {
        updatedItems = state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updatedItems = [
          ...state.items,
          {
            id: product.id,
            product,
            quantity,
            price: product.price * quantity,
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
          ? { ...item, quantity, price: item.product.price * quantity }
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