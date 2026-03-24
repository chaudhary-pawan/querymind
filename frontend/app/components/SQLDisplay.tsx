import React from 'react';

interface SQLDisplayProps {
  sql: string;
  onExplain?: () => void;
  explaining?: boolean;
}

const SQLDisplay: React.FC<SQLDisplayProps> = ({ sql, onExplain, explaining }) => {
  if (!sql) return null;

  return (
    <div className="w-full flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between px-2">
        <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
          Generated SQL
        </label>
        {onExplain && (
          <button 
            onClick={onExplain}
            disabled={explaining}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:text-white/20 transition-colors flex items-center gap-1"
          >
            {explaining ? 'Explaining...' : 'Explain Query'}
          </button>
        )}
      </div>
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <pre className="relative p-6 bg-[#0d1117]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto text-sm text-blue-100 font-mono shadow-inner custom-scrollbar">
          <code>{sql}</code>
        </pre>
      </div>
    </div>
  );
};

export default SQLDisplay;
