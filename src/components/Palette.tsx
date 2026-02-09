import React from "react";
import { NODE_TEMPLATES } from "../data";
import { NodeType } from "../types";

interface PaletteProps {
  onAdd: (type: NodeType) => void;
}

const NODE_ORDER: NodeType[] = [
  "sales",
  "order",
  "upsell",
  "downsell",
  "thankyou",
];

const Palette: React.FC<PaletteProps> = ({ onAdd }) => {
  return (
    <aside className="palette" aria-label="Node palette">
      <div className="palette-header">
        <p className="eyebrow">Palette</p>
        <h2>Add a Page</h2>
      </div>
      <div className="palette-list">
        {NODE_ORDER.map((type) => {
          const template = NODE_TEMPLATES[type];
          return (
            <button
              key={type}
              type="button"
              className="palette-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-funnel-node", type);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd(type)}
            >
              <span
                className="palette-icon"
                style={{ background: template.accent }}
                aria-hidden="true"
              >
                {template.emoji}
              </span>
              <span className="palette-text">
                <span className="palette-title">{template.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default Palette;
