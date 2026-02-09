import React from "react";

interface AlertModalProps {
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ message, onClose }) => {
  return (
    <div className="alert-overlay" role="presentation" onClick={onClose}>
      <div
        className="alert-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="Warning"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Warning</h3>
        <p>{message}</p>
        <button type="button" className="action-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
