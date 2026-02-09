import React, { useMemo, useRef, useState } from "react";
import CanvasStage from "./components/CanvasStage";
import AlertModal from "./components/AlertModal";
import Palette from "./components/Palette";
import {
  DEFAULT_EDGES,
  DEFAULT_NODES,
  NODE_DIMENSIONS,
  STORAGE_KEY,
} from "./data";
import { FunnelEdge, FunnelNode, FunnelState, NodeType } from "./types";
import {
  clampZoom,
  coerceState,
  createId,
  dedupeEdges,
  getNextTitle,
} from "./utils";

const defaultPan = { x: 80, y: 60 };
const defaultZoom = 0.8;

const cloneDefaults = () => ({
  nodes: DEFAULT_NODES.map((node) => ({ ...node })),
  edges: DEFAULT_EDGES.map((edge) => ({ ...edge })),
});

const getInitialState = (): FunnelState => {
  if (typeof window === "undefined") {
    return { ...cloneDefaults(), pan: defaultPan, zoom: defaultZoom };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...cloneDefaults(), pan: defaultPan, zoom: defaultZoom };
    }
    const parsed = JSON.parse(stored) as FunnelState;
    const coerced = coerceState(parsed);
    if (coerced) {
      return {
        nodes: coerced.nodes,
        edges: coerced.edges,
        pan: coerced.pan ?? defaultPan,
        zoom: coerced.zoom ?? defaultZoom,
      };
    }
  } catch {
    // Ignore invalid local storage.
  }
  return { ...cloneDefaults(), pan: defaultPan, zoom: defaultZoom };
};

const FunnelBuilder: React.FC = () => {
  const initialRef = useRef<FunnelState | null>(null);
  if (!initialRef.current) {
    initialRef.current = getInitialState();
  }

  const [nodes, setNodes] = useState<FunnelNode[]>(initialRef.current.nodes);
  const [edges, setEdges] = useState<FunnelEdge[]>(initialRef.current.edges);
  const [pan, setPan] = useState<{ x: number; y: number }>(
    initialRef.current.pan ?? defaultPan
  );
  const [zoom, setZoom] = useState<number>(
    initialRef.current.zoom ?? defaultZoom
  );
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [importError, setImportError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const nodeStatus = useMemo(
    () => ({} as Record<string, "warning" | "info" | undefined>),
    []
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const payload: FunnelState = { nodes, edges, pan, zoom };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors.
    }
  }, [nodes, edges, pan, zoom]);

  const removeInvalidSalesEdges = (
    nextNodes: FunnelNode[],
    nextEdges: FunnelEdge[]
  ) => {
    const nodesById = new Map(nextNodes.map((node) => [node.id, node]));
    let removed = false;
    const filtered = nextEdges.filter((edge) => {
      const fromNode = nodesById.get(edge.from);
      const toNode = nodesById.get(edge.to);
      if (fromNode?.type === "sales" && toNode?.type !== "order") {
        removed = true;
        return false;
      }
      return true;
    });
    return { edges: filtered, removed };
  };

  const pushWarning = (message: string) => {
    setWarningMessage(message);
  };

  const addNodeAt = (type: NodeType, position: { x: number; y: number }) => {
    setNodes((prev) => [
      ...prev,
      {
        id: createId(`node-${type}`),
        type,
        title: getNextTitle(type, prev),
        x: position.x,
        y: position.y,
      },
    ]);
  };

  const handlePaletteAdd = (type: NodeType) => {
    const fallback = {
      x: (-pan.x + 120) / zoom,
      y: (-pan.y + 120) / zoom,
    };
    const center = {
      x: (-pan.x + viewport.width / 2) / zoom - NODE_DIMENSIONS.width / 2,
      y: (-pan.y + viewport.height / 2) / zoom - NODE_DIMENSIONS.height / 2,
    };
    addNodeAt(type, viewport.width ? center : fallback);
  };

  const handleDropNode = (type: NodeType, position: { x: number; y: number }) => {
    addNodeAt(type, position);
  };

  const handleNodeMove = (id: string, position: { x: number; y: number }) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, ...position } : node))
    );
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== id));
    setEdges((prev) => prev.filter((edge) => edge.from !== id && edge.to !== id));
  };

  const handleDeleteEdge = (id: string) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== id));
  };

  const handleConnect = (fromId: string, toId: string) => {
    if (fromId === toId) {
      return;
    }
    const fromNode = nodes.find((node) => node.id === fromId);
    const toNode = nodes.find((node) => node.id === toId);
    if (!fromNode || !toNode) {
      return;
    }
    if (fromNode.type === "thankyou") {
      return;
    }

    if (fromNode.type === "sales") {
      if (toNode.type !== "order") {
        setEdges((prev) => removeInvalidSalesEdges(nodes, prev).edges);
        pushWarning("Sales Page can only connect to Order Page.");
        return;
      }
    }

    const nextEdge: FunnelEdge = {
      id: createId("edge"),
      from: fromId,
      to: toId,
    };
    setEdges((prev) => dedupeEdges([...prev, nextEdge]));
  };

  const handleExport = () => {
    const payload: FunnelState = { nodes, edges, pan, zoom };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "funnel.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        const coerced = coerceState(parsed as FunnelState);
        if (!coerced) {
          setImportError("Invalid funnel JSON. Please check the file format.");
          return;
        }
        const cleaned = removeInvalidSalesEdges(coerced.nodes, coerced.edges);
        setNodes(coerced.nodes);
        setEdges(cleaned.edges);
        setPan(coerced.pan ?? defaultPan);
        setZoom(coerced.zoom ?? defaultZoom);
        setImportError(null);
        setWarningMessage(null);
        if (cleaned.removed) {
          pushWarning("Removed invalid Sales Page connections.");
        }
      } catch {
        setImportError("Invalid funnel JSON. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    const defaults = cloneDefaults();
    setNodes(defaults.nodes);
    setEdges(defaults.edges);
    setPan(defaultPan);
    setZoom(defaultZoom);
    setImportError(null);
    setWarningMessage(null);
  };

  const handleZoomIn = () => {
    setZoom((prev) => clampZoom(Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => clampZoom(Number((prev - 0.1).toFixed(2))));
  };

  const handleZoomReset = () => {
    setZoom(defaultZoom);
  };

  const handleZoomChange = (next: { zoom: number; pan: { x: number; y: number } }) => {
    setZoom(clampZoom(next.zoom));
    setPan(next.pan);
  };

  return (
    <div className="builder">
      <header className="builder-header">
        <div>
          <p className="eyebrow">Cartpanda Practical Test - Andrea</p>
          <h1>Upsell Funnel Builder</h1>
        </div>
        <div className="builder-actions">
          <button type="button" className="action-button" onClick={handleExport}>
            Export JSON
          </button>
          <label className="action-button action-import" htmlFor="import-json">
            Import JSON
            <input
              id="import-json"
              type="file"
              accept="application/json"
              onChange={handleImport}
            />
          </label>
          <button
            type="button"
            className="action-button action-ghost"
            onClick={handleReset}
          >
            Reset
          </button>
          <div className="zoom-controls" role="group" aria-label="Zoom controls">
            <button type="button" className="zoom-button" onClick={handleZoomOut}>
              -
            </button>
            <button type="button" className="zoom-button" onClick={handleZoomReset}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="zoom-button" onClick={handleZoomIn}>
              +
            </button>
          </div>
        </div>
      </header>
      {warningMessage && (
        <AlertModal
          message={warningMessage}
          onClose={() => setWarningMessage(null)}
        />
      )}
      {importError && <div className="import-error">{importError}</div>}
      <div className="builder-layout">
        <Palette onAdd={handlePaletteAdd} />
        <CanvasStage
          nodes={nodes}
          edges={edges}
          pan={pan}
          zoom={zoom}
          nodeStatus={nodeStatus}
          onPanChange={setPan}
          onZoomChange={handleZoomChange}
          onNodeMove={handleNodeMove}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onConnect={handleConnect}
          onDropNode={handleDropNode}
          onViewportResize={setViewport}
        />
      </div>
    </div>
  );
};

export default FunnelBuilder;
