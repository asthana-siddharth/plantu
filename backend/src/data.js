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
  },
  {
    id: "ORD002",
    date: "February 28, 2026",
    status: "Shipped",
    items: 2,
    total: 648,
    items_list: ["Tomato Seeds", "Garden Pruner"],
  },
  {
    id: "ORD003",
    date: "February 20, 2026",
    status: "Processing",
    items: 1,
    total: 599,
    items_list: ["Pothos Plant"],
  },
];

module.exports = {
  products,
  devices,
  orders,
};
