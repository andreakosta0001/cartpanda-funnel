import React from "react";
import { NODE_DIMENSIONS, NODE_TEMPLATES } from "../data";
import { FunnelNode } from "../types";

interface NodeCardProps {
  node: FunnelNode;
  status?: "warning" | "info";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onStartConnection: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDelete: (id: string) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  status,
  onPointerDown,
  onStartConnection,
  onDelete,
}) => {
  const template = NODE_TEMPLATES[node.type];
  return (
    <div
      className={`node-card node-${node.type} ${
        status ? `node-${status}` : ""
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_DIMENSIONS.width,
        height: NODE_DIMENSIONS.height,
      }}
      onPointerDown={onPointerDown}
      role="group"
      aria-label={`${node.title} node`}
    >
      <div className="node-header">
        <span
          className="node-icon"
          style={{ background: template.accent }}
          aria-hidden="true"
        >
          {template.emoji}
        </span>
        <div className="node-title">{node.title}</div>
      </div>
      {status && <span className="node-status">{status}</span>}
      <button
        type="button"
        className="node-delete"
        aria-label={`Delete ${node.title}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onDelete(node.id);
        }}
      >
        ✕
      </button>

      {node.type !== "sales" && (
        <button
          type="button"
          className="node-handle node-handle-in"
          data-handle="in"
          data-node-id={node.id}
          aria-label={`Incoming connector for ${node.title}`}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
      {node.type !== "thankyou" && (
        <button
          type="button"
          className="node-handle node-handle-out"
          data-handle="out"
          data-node-id={node.id}
          aria-label={`Outgoing connector for ${node.title}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            onStartConnection(event);
          }}
        />
      )}
    </div>
  );
};

export default NodeCard;
