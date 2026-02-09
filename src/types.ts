export type NodeType = "sales" | "order" | "upsell" | "downsell" | "thankyou";

export type HandleType = "in" | "out";

export interface FunnelNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
}

export interface FunnelEdge {
  id: string;
  from: string;
  to: string;
}

export interface FunnelState {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  pan?: {
    x: number;
    y: number;
  };
  zoom?: number;
}

export interface ValidationMessage {
  id: string;
  nodeId?: string;
  level: "warning" | "info";
  message: string;
}
