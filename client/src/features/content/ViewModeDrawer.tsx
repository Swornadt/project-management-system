import React from 'react';
import { Eye, X } from 'lucide-react';
import type { ViewStateMode } from '../../types';

interface ViewModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ViewStateMode;
  onChangeMode: (mode: ViewStateMode) => void;
}

export const ViewModeDrawer: React.FC<ViewModeDrawerProps> = ({
  isOpen,
  onClose,
  currentMode,
  onChangeMode,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="viewModeDrawer"
      className="bg-[#f0f4f8] border border-[#dfe3e7] p-3 rounded-xl flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-[#5645d4]" />
        <span className="text-[12px] font-semibold text-[#37352f]">
          Simulation Preview:
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          id="mode-normal-btn"
          onClick={() => onChangeMode('normal')}
          className={`px-2.5 py-1 text-[12px] rounded transition-all ${
            currentMode === 'normal'
              ? 'font-semibold bg-white text-[#37352f] shadow-xs'
              : 'font-normal hover:bg-white/60 text-[#5d5b54]'
          }`}
        >
          Normal Content
        </button>

        <button
          id="mode-skeleton-btn"
          onClick={() => onChangeMode('skeleton')}
          className={`px-2.5 py-1 text-[12px] rounded transition-all ${
            currentMode === 'skeleton'
              ? 'font-semibold bg-white text-[#37352f] shadow-xs'
              : 'font-normal hover:bg-white/60 text-[#5d5b54]'
          }`}
        >
          Skeleton Loading
        </button>

        <button
          id="mode-empty-btn"
          onClick={() => onChangeMode('empty')}
          className={`px-2.5 py-1 text-[12px] rounded transition-all ${
            currentMode === 'empty'
              ? 'font-semibold bg-white text-[#37352f] shadow-xs'
              : 'font-normal hover:bg-white/60 text-[#5d5b54]'
          }`}
        >
          Empty State
        </button>
      </div>

      <button
        id="closeModeDrawer"
        onClick={onClose}
        className="text-[#9b9a97] hover:text-[#37352f] p-1 rounded hover:bg-black/5 transition-colors"
        title="Close View Mode Tray"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
