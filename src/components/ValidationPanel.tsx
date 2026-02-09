import React from "react";
import { ValidationMessage } from "../types";

interface ValidationPanelProps {
  messages: ValidationMessage[];
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ messages }) => {
  const warnings = messages.filter((msg) => msg.level === "warning");
  const infos = messages.filter((msg) => msg.level === "info");

  return (
    <aside className="validation" aria-live="polite">
      <div className="validation-header">
        <p className="eyebrow">Validation</p>
        <h2>Funnel Health</h2>
        <p className="validation-count">
          {warnings.length === 0 && infos.length === 0
            ? "Everything looks connected."
            : `${warnings.length} warning${
                warnings.length === 1 ? "" : "s"
              }, ${infos.length} note${infos.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="validation-list">
        {messages.length === 0 ? (
          <div className="validation-empty">
            No issues detected. Keep shipping.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`validation-item validation-${msg.level}`}
            >
              <span className="validation-dot" aria-hidden="true" />
              <span>{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ValidationPanel;
