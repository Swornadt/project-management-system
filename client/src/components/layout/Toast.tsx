import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  title,
  subtitle = 'Opening in reader drawer...',
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="actionToast"
      className="fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in"
    >
      <div className="bg-[#37352f] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10">
        <CheckCircle className="w-4 h-4 text-[#1aae39] shrink-0" />
        <div className="flex flex-col max-w-xs">
          <span id="toastTitle" className="text-[13px] font-medium leading-tight truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] text-[#c4c2be] leading-tight truncate">
              {subtitle}
            </span>
          )}
        </div>
        <button
          id="closeToastBtn"
          onClick={onClose}
          className="ml-2 text-[#c4c2be] hover:text-white transition-colors p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
