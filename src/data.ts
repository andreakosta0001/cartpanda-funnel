import { FunnelEdge, FunnelNode, NodeType } from "./types";

export const STORAGE_KEY = "cartpanda-funnel-builder";

export const NODE_DIMENSIONS = {
  width: 224,
  height: 128,
};

export const NODE_TEMPLATES: Record<
  NodeType,
  {
    label: string;
    buttonLabel: string;
    accent: string;
    helper: string;
    emoji: string;
  }
> = {
  sales: {
    label: "Sales Page",
    buttonLabel: "Start Checkout",
    accent: "#e07a5f",
    helper: "Landing + product details",
    emoji: "S",
  },
  order: {
    label: "Order Page",
    buttonLabel: "Place Order",
    accent: "#3d405b",
    helper: "Shipping + payment",
    emoji: "O",
  },
  upsell: {
    label: "Upsell",
    buttonLabel: "Add to Order",
    accent: "#81b29a",
    helper: "Post-purchase offer",
    emoji: "U",
  },
  downsell: {
    label: "Downsell",
    buttonLabel: "Keep Savings",
    accent: "#f2cc8f",
    helper: "Alternative offer",
    emoji: "D",
  },
  thankyou: {
    label: "Thank You",
    buttonLabel: "Finish",
    accent: "#6b9080",
    helper: "Confirmation + next steps",
    emoji: "T",
  },
};

export const DEFAULT_NODES: FunnelNode[] = [
  {
    id: "node-sales",
    type: "sales",
    title: "Sales Page",
    x: 40,
    y: 200,
  },
  {
    id: "node-order",
    type: "order",
    title: "Order Page",
    x: 340,
    y: 200,
  },
  {
    id: "node-upsell-1",
    type: "upsell",
    title: "Upsell 1",
    x: 640,
    y: 140,
  },
  {
    id: "node-upsell-2",
    type: "upsell",
    title: "Upsell 2",
    x: 940,
    y: 140,
  },
  {
    id: "node-thanks",
    type: "thankyou",
    title: "Thank You",
    x: 1240,
    y: 200,
  },
];

export const DEFAULT_EDGES: FunnelEdge[] = [
  {
    id: "edge-sales-order",
    from: "node-sales",
    to: "node-order",
  },
  {
    id: "edge-order-upsell-1",
    from: "node-order",
    to: "node-upsell-1",
  },
  {
    id: "edge-upsell-1-upsell-2",
    from: "node-upsell-1",
    to: "node-upsell-2",
  },
  {
    id: "edge-upsell-2-thanks",
    from: "node-upsell-2",
    to: "node-thanks",
  },
];
