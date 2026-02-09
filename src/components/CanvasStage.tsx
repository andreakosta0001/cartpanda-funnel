import React, { useEffect, useMemo, useRef, useState } from "react";
import { NODE_DIMENSIONS } from "../data";
import { FunnelEdge, FunnelNode, NodeType } from "../types";
import { clampZoom, getHandlePosition } from "../utils";
import NodeCard from "./NodeCard";

interface CanvasStageProps {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  pan: { x: number; y: number };
  zoom: number;
  nodeStatus: Record<string, "warning" | "info" | undefined>;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (next: { zoom: number; pan: { x: number; y: number } }) => void;
  onNodeMove: (id: string, position: { x: number; y: number }) => void;
  onNodeDragStart?: () => void;
  onNodeDragEnd?: () => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onDropNode: (type: NodeType, position: { x: number; y: number }) => void;
  onViewportResize?: (size: { width: number; height: number }) => void;
}

interface ConnectingState {
  fromId: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

const CanvasStage: React.FC<CanvasStageProps> = ({
  nodes,
  edges,
  pan,
  zoom,
  nodeStatus,
  onPanChange,
  onZoomChange,
  onNodeMove,
  onNodeDragStart,
  onNodeDragEnd,
  onDeleteNode,
  onDeleteEdge,
  onConnect,
  onDropNode,
  onViewportResize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [hoveredInput, setHoveredInput] = useState<string | null>(null);
  const [edgeHover, setEdgeHover] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const next = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      };
      setSize(next);
      onViewportResize?.(next);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onViewportResize]);

  const clientToWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const getInputHandleAtPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const handle = element?.closest(
      '[data-handle="in"]'
    ) as HTMLElement | null;
    return handle?.dataset.nodeId ?? null;
  };

  const getEdgeHit = (worldPoint: { x: number; y: number }) => {
    const distanceToSegment = (
      p: { x: number; y: number },
      v: { x: number; y: number },
      w: { x: number; y: number }
    ) => {
      const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
      if (l2 === 0) {
        return Math.hypot(p.x - v.x, p.y - v.y);
      }
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
      return Math.hypot(p.x - proj.x, p.y - proj.y);
    };

    const bezierPoint = (
      t: number,
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number }
    ) => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;
      return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
      };
    };

    const threshold = 8 / zoom;
    let hitId: string | null = null;
    edges.forEach((edge) => {
      if (hitId) {
        return;
      }
      const fromNode = nodes.find((node) => node.id === edge.from);
      const toNode = nodes.find((node) => node.id === edge.to);
      if (!fromNode || !toNode) {
        return;
      }
      const start = getHandlePosition(fromNode, "out");
      const end = getHandlePosition(toNode, "in");
      const dx = Math.max(120, Math.abs(end.x - start.x) * 0.5);
      const cp1 = { x: start.x + dx, y: start.y };
      const cp2 = { x: end.x - dx, y: end.y };

      const steps = 20;
      let prev = start;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const next = bezierPoint(t, start, cp1, cp2, end);
        const dist = distanceToSegment(worldPoint, prev, next);
        if (dist <= threshold) {
          hitId = edge.id;
          break;
        }
        prev = next;
      }
    });
    return hitId;
  };

  const handleNodePointerDown = (nodeId: string) => {
    return (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-handle]")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onNodeDragStart?.();
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }
      const world = clientToWorld(event.clientX, event.clientY);
      setDragging({
        id: nodeId,
        offsetX: world.x - node.x,
        offsetY: world.y - node.y,
      });
    };
  };

  const handleStartConnection = (nodeId: string) => {
    return () => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node || node.type === "thankyou") {
        return;
      }
      const start = getHandlePosition(node, "out");
      setConnecting({
        fromId: nodeId,
        start,
        end: start,
      });
    };
  };

  useEffect(() => {
    if (!dragging && !panning && !connecting) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      if (dragging) {
        const world = clientToWorld(event.clientX, event.clientY);
        onNodeMove(dragging.id, {
          x: world.x - dragging.offsetX,
          y: world.y - dragging.offsetY,
        });
      }
      if (panning) {
        onPanChange({
          x: panning.origin.x + (event.clientX - panning.startX),
          y: panning.origin.y + (event.clientY - panning.startY),
        });
      }
      if (connecting) {
        const world = clientToWorld(event.clientX, event.clientY);
        setConnecting({ ...connecting, end: world });
        setHoveredInput(getInputHandleAtPoint(event.clientX, event.clientY));
      }
    };

    const handleUp = (event: PointerEvent) => {
      if (dragging) {
        setDragging(null);
        onNodeDragEnd?.();
      }
      if (panning) {
        setPanning(null);
      }
      if (connecting) {
        const targetId = getInputHandleAtPoint(event.clientX, event.clientY);
        if (targetId) {
          onConnect(connecting.fromId, targetId);
        }
        setConnecting(null);
        setHoveredInput(null);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    const handleCancel = () => {
      if (dragging) {
        setDragging(null);
        onNodeDragEnd?.();
      }
      if (panning) {
        setPanning(null);
      }
      if (connecting) {
        setConnecting(null);
        setHoveredInput(null);
      }
    };
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [
    dragging,
    panning,
    connecting,
    onNodeMove,
    onNodeDragEnd,
    onPanChange,
    onConnect,
    pan,
  ]);

  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest(".node-card")) {
      return;
    }
    if (!connecting) {
      const worldPoint = clientToWorld(event.clientX, event.clientY);
      const hitEdgeId = getEdgeHit(worldPoint);
      if (hitEdgeId) {
        event.preventDefault();
        onDeleteEdge(hitEdgeId);
        return;
      }
    }
    event.preventDefault();
    setPanning({
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
    });
  };

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (dragging || panning || connecting) {
      if (edgeHover) {
        setEdgeHover(false);
      }
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".node-card")) {
      if (edgeHover) {
        setEdgeHover(false);
      }
      return;
    }
    const worldPoint = clientToWorld(event.clientX, event.clientY);
    const hit = getEdgeHit(worldPoint);
    setEdgeHover(Boolean(hit));
  };

  const handleCanvasPointerLeave = () => {
    if (edgeHover) {
      setEdgeHover(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }
    event.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const delta = event.deltaY;
    const nextZoom = clampZoom(
      Number((zoom + (delta > 0 ? -0.1 : 0.1)).toFixed(2))
    );
    if (nextZoom === zoom) {
      return;
    }
    const worldX = (event.clientX - rect.left - pan.x) / zoom;
    const worldY = (event.clientY - rect.top - pan.y) / zoom;
    const nextPan = {
      x: event.clientX - rect.left - worldX * nextZoom,
      y: event.clientY - rect.top - worldY * nextZoom,
    };
    onZoomChange({ zoom: nextZoom, pan: nextPan });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(
      "application/x-funnel-node"
    ) as NodeType;
    if (!type) {
      return;
    }
    const world = clientToWorld(event.clientX, event.clientY);
    onDropNode(type, {
      x: world.x - NODE_DIMENSIONS.width / 2,
      y: world.y - NODE_DIMENSIONS.height / 2,
    });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const canvasElements = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size.width, size.height);

    const gridSize = 28 * zoom;
    const offsetX = ((pan.x % gridSize) + gridSize) % gridSize;
    const offsetY = ((pan.y % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = "rgba(30, 28, 24, 0.08)";
    ctx.lineWidth = 1;
    for (let x = offsetX; x < size.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.stroke();
    }
    for (let y = offsetY; y < size.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }

    const drawArrow = (
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      const dx = Math.max(120, Math.abs(end.x - start.x) * 0.5);
      const cp1 = { x: start.x + dx, y: start.y };
      const cp2 = { x: end.x - dx, y: end.y };

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
      ctx.strokeStyle = "rgba(29, 26, 20, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const angle = Math.atan2(end.y - cp2.y, end.x - cp2.x);
      const arrowLength = 14;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - arrowLength * Math.cos(angle - Math.PI / 7),
        end.y - arrowLength * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        end.x - arrowLength * Math.cos(angle + Math.PI / 7),
        end.y - arrowLength * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(29, 26, 20, 0.8)";
      ctx.fill();
    };

    const toScreen = (point: { x: number; y: number }) => ({
      x: point.x * zoom + pan.x,
      y: point.y * zoom + pan.y,
    });

    canvasElements.edges.forEach((edge) => {
      const fromNode = canvasElements.nodes.find(
        (node) => node.id === edge.from
      );
      const toNode = canvasElements.nodes.find(
        (node) => node.id === edge.to
      );
      if (!fromNode || !toNode) {
        return;
      }
      const startWorld = getHandlePosition(fromNode, "out");
      const endWorld = getHandlePosition(toNode, "in");
      drawArrow(toScreen(startWorld), toScreen(endWorld));
    });

    if (connecting) {
      const start = toScreen(connecting.start);
      const end = toScreen(connecting.end);
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(29, 26, 20, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }
  }, [canvasElements, size, pan, zoom, connecting]);

  return (
    <div
      ref={containerRef}
      className={`canvas-stage${
        panning ? " is-panning" : edgeHover ? " is-edge-hover" : ""
      }`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerLeave={handleCanvasPointerLeave}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      role="application"
      aria-label="Funnel canvas"
    >
      <canvas ref={canvasRef} className="canvas-layer" />
      <div
        className="nodes-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            status={nodeStatus[node.id]}
            onPointerDown={handleNodePointerDown(node.id)}
            onStartConnection={handleStartConnection(node.id)}
            onDelete={onDeleteNode}
          />
        ))}
      </div>
      <div className="canvas-hint" aria-hidden="true" />
      {hoveredInput && (
        <div className="canvas-ghost">
          Connecting to{" "}
          {nodes.find((node) => node.id === hoveredInput)?.title ?? "node"}
        </div>
      )}
    </div>
  );
};

export default CanvasStage;
