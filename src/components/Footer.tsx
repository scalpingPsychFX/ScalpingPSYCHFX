import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-tight text-slate-800 whitespace-nowrap">
          Scalping Psych fx
        </span>
        <p className="text-xs text-slate-600 leading-relaxed">
          For education only. Not financial advice. Trading carries high risk and profits are never guaranteed.
        </p>
      </div>
    </footer>
  );
};
