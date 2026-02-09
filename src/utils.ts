import { NODE_DIMENSIONS, NODE_TEMPLATES } from "./data";
import {
  FunnelEdge,
  FunnelNode,
  FunnelState,
  HandleType,
  NodeType,
  ValidationMessage,
} from "./types";

export const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const isNodeType = (value: unknown): value is NodeType =>
  value === "sales" ||
  value === "order" ||
  value === "upsell" ||
  value === "downsell" ||
  value === "thankyou";

export const getNextTitle = (type: NodeType, nodes: FunnelNode[]) => {
  if (type === "upsell") {
    const used = new Set<number>();
    nodes
      .filter((node) => node.type === "upsell")
      .forEach((node) => {
        const match = node.title.match(/^Upsell\s+(\d+)$/i);
        if (match) {
          used.add(Number(match[1]));
        }
      });
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    return `Upsell ${next}`;
  }
  if (type === "downsell") {
    const used = new Set<number>();
    nodes
      .filter((node) => node.type === "downsell")
      .forEach((node) => {
        const match = node.title.match(/^Downsell\s+(\d+)$/i);
        if (match) {
          used.add(Number(match[1]));
        }
      });
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    return `Downsell ${next}`;
  }
  return NODE_TEMPLATES[type].label;
};

export const getHandlePosition = (node: FunnelNode, handle: HandleType) => {
  const { width, height } = NODE_DIMENSIONS;
  return {
    x: node.x + (handle === "out" ? width : 0),
    y: node.y + height / 2,
  };
};

export const coerceState = (raw: FunnelState): FunnelState | null => {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    return null;
  }

  const nodes: FunnelNode[] = raw.nodes
    .filter((node) => node && isNodeType(node.type))
    .map((node) => ({
      id: typeof node.id === "string" ? node.id : createId("node"),
      type: node.type,
      title:
        typeof node.title === "string" && node.title.trim().length > 0
          ? node.title
          : NODE_TEMPLATES[node.type].label,
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
    }));

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges: FunnelEdge[] = raw.edges
    .filter(
      (edge) =>
        edge &&
        typeof edge.from === "string" &&
        typeof edge.to === "string" &&
        edge.from !== edge.to &&
        nodeIds.has(edge.from) &&
        nodeIds.has(edge.to)
    )
    .map((edge) => ({
      id: typeof edge.id === "string" ? edge.id : createId("edge"),
      from: edge.from,
      to: edge.to,
    }));

  const pan =
    raw.pan && typeof raw.pan.x === "number" && typeof raw.pan.y === "number"
      ? { x: raw.pan.x, y: raw.pan.y }
      : undefined;

  const zoom = typeof raw.zoom === "number" ? raw.zoom : undefined;

  return { nodes, edges, pan, zoom };
};

export const buildValidation = (
  nodes: FunnelNode[],
  edges: FunnelEdge[]
): ValidationMessage[] => {
  const messages: ValidationMessage[] = [];
  const outgoing = new Map<string, FunnelEdge[]>();
  const incoming = new Map<string, FunnelEdge[]>();

  edges.forEach((edge) => {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
  });

  nodes.forEach((node) => {
    const outCount = outgoing.get(node.id)?.length ?? 0;
    const inCount = incoming.get(node.id)?.length ?? 0;

    if (node.type === "thankyou" && outCount > 0) {
      messages.push({
        id: `thankyou-${node.id}`,
        nodeId: node.id,
        level: "warning",
        message: "Thank You pages must not have outgoing connections.",
      });
    }

    if (node.type === "sales") {
      const targets = outgoing.get(node.id) ?? [];
      const targetNodeIds = targets.map((edge) => edge.to);
      const hasOrderTarget = nodes.some(
        (candidate) =>
          candidate.type === "order" && targetNodeIds.includes(candidate.id)
      );

      if (outCount !== 1 || !hasOrderTarget) {
        messages.push({
          id: `sales-${node.id}`,
          nodeId: node.id,
          level: "warning",
          message:
            "Sales Page should connect to exactly one Order Page (adjust to fix).",
        });
      }
    }

    if (node.type !== "sales" && inCount === 0) {
      messages.push({
        id: `orphan-${node.id}`,
        nodeId: node.id,
        level: "info",
        message: `${node.title} has no incoming connection.`,
      });
    }
  });

  return messages;
};

export const dedupeEdges = (edges: FunnelEdge[]): FunnelEdge[] => {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.from}-${edge.to}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const clampZoom = (value: number) =>
  Math.min(1.6, Math.max(0.6, value));
