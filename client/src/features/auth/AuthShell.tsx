import React from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Centered card used by the public auth pages (verify, forgot, reset). */
export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#f7f6f5] px-4">
    <div className="w-full max-w-sm bg-white rounded-xl border border-[#e8e7e4] shadow-lg p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-[#37352f]">{title}</h1>
        {subtitle && <p className="text-xs text-[#5d5b54] mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export const authInputClass =
  'w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]';
export const authButtonClass =
  'w-full px-4 py-2 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-sm transition-all disabled:opacity-50';
