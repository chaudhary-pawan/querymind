"use client";

import React, { useState } from 'react';

interface TokenHistoryItem {
  timestamp: string;
  task: string;
  details: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface TokenUsageStats {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  history: TokenHistoryItem[];
}

interface TokenDashboardProps {
  stats: TokenUsageStats;
  onReset: () => void;
}

const LIMIT = 10000;

const TokenDashboard: React.FC<TokenDashboardProps> = ({ stats, onReset }) => {
  const [showHistory, setShowHistory] = useState(false);

  const totalTokens = stats.total_tokens || 0;
  const percentage = Math.min(100, (totalTokens / LIMIT) * 100);

  // Determine indicator color based on usage percentage
  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-400";
  let borderGlow = "shadow-emerald-500/20";
  let warningMessage = "";

  if (percentage >= 95) {
    barColor = "bg-rose-600 animate-pulse";
    textColor = "text-rose-400";
    borderGlow = "shadow-rose-500/30";
    warningMessage = "CRITICAL: Token limit reached or exceeded! Please reset usage stats to continue querying.";
  } else if (percentage >= 80) {
    barColor = "bg-amber-600";
    textColor = "text-amber-400";
    borderGlow = "shadow-amber-500/30";
    warningMessage = "WARNING: Approaching the 10,000 token usage limit. Consider resetting stats.";
  } else if (percentage >= 50) {
    barColor = "bg-blue-500";
    textColor = "text-blue-400";
    borderGlow = "shadow-blue-500/20";
  }

  return (
    <div className="w-full flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Groq Token Consumption</h3>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">Model: llama2-7b-chat (Limit: 10,000 tokens)</p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Reset Stats
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40 font-semibold">Consumption Level</span>
          <span className={`font-bold font-mono ${textColor}`}>{totalTokens.toLocaleString()} / {LIMIT.toLocaleString()} tokens ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Warning Notification */}
      {warningMessage && (
        <div className={`p-3 bg-red-500/10 border ${percentage >= 95 ? 'border-rose-500/20 text-rose-400' : 'border-amber-500/20 text-amber-400'} rounded-xl text-xs flex items-start gap-2.5 animate-pulse`}>
          <span className="text-base leading-none">⚠️</span>
          <p className="leading-normal font-medium">{warningMessage}</p>
        </div>
      )}

      {/* Details breakdown */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Prompt (Inputs)</div>
          <div className="text-lg font-bold font-mono text-white/80 mt-0.5">{stats.total_prompt_tokens?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Completion (Outputs)</div>
          <div className="text-lg font-bold font-mono text-white/80 mt-0.5">{stats.total_completion_tokens?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* History expander */}
      {stats.history && stats.history.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
          >
            <span>{showHistory ? "Hide Usage Log" : "View Usage Log"}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar bg-black/20 text-[11px] animate-in slide-in-from-top-2 duration-300">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-white/40">
                    <th className="px-4 py-2 font-bold uppercase tracking-wider">Task</th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider">Details</th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/60 font-mono">
                  {stats.history.slice().reverse().map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 font-sans font-semibold text-white/80 whitespace-nowrap">{item.task}</td>
                      <td className="px-4 py-2 truncate max-w-[200px]" title={item.details}>{item.details}</td>
                      <td className="px-4 py-2 text-right text-blue-400/80 font-bold">{item.total_tokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenDashboard;
