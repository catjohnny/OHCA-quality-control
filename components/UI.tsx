import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    error: 'bg-red-50 text-red-600 border-red-200',
    info: 'bg-medical-50 text-medical-600 border-medical-200'
  }[type];

  const icon = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle'
  }[type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slideDown">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-lg ${bgColor}`}>
        <i className={`fas ${icon} text-lg`}></i>
        <span className="font-medium text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '確認',
  cancelText = '取消'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <div className="text-sm text-slate-500 mb-6">{message}</div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md shadow-red-200"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
