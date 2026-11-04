import React from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  onDismiss?: () => void;
  action?: ToastAction;
}

const toastIcons = {
  success: 'fa-circle-check',
  warning: 'fa-triangle-exclamation',
  danger: 'fa-circle-xmark',
  info: 'fa-circle-info',
};

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss, action }) => (
  <div className={`agency-toast agency-toast-${type}`}>
    <div className="toast-message" role={type === 'danger' || type === 'warning' ? 'alert' : 'status'} aria-atomic="true">
      <i className={`fa-solid ${toastIcons[type]}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
    {action && <button type="button" className="toast-action" onClick={action.onClick}>{action.label}</button>}
    {onDismiss && (
      <button type="button" className="shell-icon-button toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification" title="Dismiss notification">
        <i className="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    )}
  </div>
);

export default Toast;
