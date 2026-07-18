import React from 'react';
import ConfidenceBadge from './ConfidenceBadge';

interface SQLDisplayProps {
  sql: string;
  onExplain?: () => void;
  explaining?: boolean;
  confidence?: number;
  confidenceLabel?: string;
  confidenceReasoning?: string;
  blocked?: boolean;
}

const SQLDisplay: React.FC<SQLDisplayProps> = ({
  sql,
  onExplain,
  explaining,
  confidence,
  confidenceLabel,
  confidenceReasoning,
  blocked,
}) => {
  if (!sql) return null;

  return (
    <div className="w-full flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between px-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
            Generated SQL
          </label>
          {confidenceLabel && confidence !== undefined && (
            <ConfidenceBadge
              confidence={confidence}
              label={confidenceLabel}
              reasoning={confidenceReasoning}
            />
          )}
        </div>
        {onExplain && !blocked && (
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
        <div className={`absolute -inset-0.5 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 ${
          blocked
            ? "bg-gradient-to-r from-red-500 to-orange-500"
            : "bg-gradient-to-r from-blue-500 to-purple-500"
        }`}></div>
        <pre className={`relative p-6 backdrop-blur-xl border rounded-2xl overflow-x-auto text-sm font-mono shadow-inner custom-scrollbar ${
          blocked
            ? "bg-red-500/5 border-red-500/20 text-red-200"
            : "bg-[#0d1117]/80 border-white/10 text-blue-100"
        }`}>
          <code>{sql}</code>
        </pre>
        {blocked && (
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 uppercase tracking-wider">
            Blocked
          </div>
        )}
      </div>
    </div>
  );
};

export default SQLDisplay;
