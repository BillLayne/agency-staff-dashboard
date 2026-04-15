import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

const toastConfig = {
  success: {
    icon: 'fa-solid fa-check-circle',
    style: 'border-green-500',
  },
  warning: {
    icon: 'fa-solid fa-exclamation-triangle',
    style: 'border-yellow-500',
  },
  danger: {
    icon: 'fa-solid fa-times-circle',
    style: 'border-red-500',
  },
  info: {
    icon: 'fa-solid fa-info-circle',
    style: 'border-blue-500',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const { icon, style } = toastConfig[type];

  return (
    <div className={`min-w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg ${style} border-l-4`}>
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <i className={`${icon} text-base`}></i>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;
