const products = [
  {
    id: 1,
    name: "Monstera Deliciosa",
    category: "plants",
    price: 599,
    rating: 4.5,
    image: "plant",
    description: "Beautiful indoor plant with large leaves",
    inStock: true,
    stockQty: 30,
  },
  {
    id: 2,
    name: "Snake Plant",
    category: "plants",
    price: 399,
    rating: 4.8,
    image: "plant",
    description: "Low maintenance, air-purifying plant",
    inStock: true,
    stockQty: 20,
  },
  {
    id: 3,
    name: "Ceramic Pot 6inch",
    category: "pots",
    price: 249,
    rating: 4.2,
    image: "pot",
    description: "Elegant ceramic pot with drainage",
    inStock: true,
    stockQty: 40,
  },
  {
    id: 4,
    name: "Tomato Seeds",
    category: "seeds",
    price: 49,
    rating: 4.6,
    image: "seed",
    description: "Hybrid tomato seeds, high yield",
    inStock: true,
    stockQty: 100,
  },
  {
    id: 5,
    name: "Garden Pruner",
    category: "tools",
    price: 299,
    rating: 4.4,
    image: "tool",
    description: "Professional stainless steel pruner",
    inStock: true,
    stockQty: 18,
  },
  {
    id: 6,
    name: "Pothos Plant",
    category: "plants",
    price: 349,
    rating: 4.7,
    image: "plant",
    description: "Trailing plant, perfect for hanging",
    inStock: false,
    stockQty: 0,
  },
];

const devices = [
  { id: 1, name: "Patio Sprinkler", isOn: true, moisture: 34, lastSeen: Date.now() },
  { id: 2, name: "Roof Planter", isOn: false, moisture: 50, lastSeen: Date.now() },
];

const orders = [
  {
    id: "ORD001",
    date: "March 5, 2026",
    status: "Delivered",
    items: 3,
    total: 1299,
    items_list: ["Monstera Deliciosa", "Ceramic Pot 6inch", "Snake Plant"],
    order_items: [
      { type: "product", id: 1, name: "Monstera Deliciosa", unitPrice: 599, quantity: 1, lineTotal: 599 },
      { type: "product", id: 3, name: "Ceramic Pot 6inch", unitPrice: 249, quantity: 1, lineTotal: 249 },
      { type: "product", id: 2, name: "Snake Plant", unitPrice: 399, quantity: 1, lineTotal: 399 },
    ],
  },
  {
    id: "ORD002",
    date: "February 28, 2026",
    status: "Shipped",
    items: 2,
    total: 648,
    items_list: ["Tomato Seeds", "Garden Pruner"],
    order_items: [
      { type: "product", id: 4, name: "Tomato Seeds", unitPrice: 49, quantity: 1, lineTotal: 49 },
      { type: "product", id: 5, name: "Garden Pruner", unitPrice: 299, quantity: 2, lineTotal: 598 },
    ],
  },
  {
    id: "ORD003",
    date: "February 20, 2026",
    status: "Processing",
    items: 1,
    total: 599,
    items_list: ["Pothos Plant"],
    order_items: [
      { type: "product", id: 6, name: "Pothos Plant", unitPrice: 599, quantity: 1, lineTotal: 599 },
    ],
  },
];

module.exports = {
  products,
  devices,
  orders,
};
