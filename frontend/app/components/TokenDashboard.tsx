"use client";

import React, { useState } from "react";

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
  compact?: boolean;
}

const LIMIT = 10000;

const TokenDashboard: React.FC<TokenDashboardProps> = ({
  stats,
  onReset,
  compact = false,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const totalTokens = stats.total_tokens || 0;
  const percentage = Math.min(100, (totalTokens / LIMIT) * 100);

  // Determine indicator color based on usage percentage
  let barColor = "from-emerald-500 to-emerald-400";
  let textColor = "text-emerald-400";
  let warningMessage = "";
  let statusLabel = "Healthy";

  if (percentage >= 95) {
    barColor = "from-rose-600 to-rose-500";
    textColor = "text-rose-400";
    warningMessage =
      "Token limit reached! Reset usage stats to continue.";
    statusLabel = "Critical";
  } else if (percentage >= 80) {
    barColor = "from-amber-600 to-amber-500";
    textColor = "text-amber-400";
    warningMessage = "Approaching the 10,000 token limit.";
    statusLabel = "Warning";
  } else if (percentage >= 50) {
    barColor = "from-blue-500 to-indigo-500";
    textColor = "text-blue-400";
    statusLabel = "Moderate";
  }

  // ── Compact mode for sidebar ──
  if (compact) {
    return (
      <div className="flex flex-col gap-3 p-4 glass-panel-subtle rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-white/25"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em]">
              Tokens
            </span>
          </div>
          <span className={`text-[10px] font-bold font-mono ${textColor}`}>
            {totalTokens.toLocaleString()}
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold ${textColor} uppercase tracking-wider`}>
            {statusLabel}
          </span>
          <button
            onClick={onReset}
            className="text-[9px] font-bold text-white/20 hover:text-red-400 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  // ── Full mode ──
  return (
    <div className="w-full flex flex-col gap-4 glass-panel rounded-2xl p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
            <svg
              className="w-4 h-4 text-indigo-400/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Groq Token Consumption
          </h3>
          <p className="text-[10px] text-white/25 font-mono mt-1">
            Model: llama2-7b-chat · Limit: 10,000 tokens
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600/[0.06] hover:bg-red-600/15 border border-red-500/20 hover:border-red-500/35 text-red-400 text-[11px] font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Reset Stats
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/35 font-semibold">Consumption</span>
          <span className={`font-bold font-mono ${textColor}`}>
            {totalTokens.toLocaleString()} / {LIMIT.toLocaleString()} (
            {percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.03]">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out relative`}
            style={{ width: `${percentage}%` }}
          >
            {/* Shimmer sweep on progress bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              style={{
                backgroundSize: "200% 100%",
                animation: "shimmer 3s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      {/* Warning */}
      {warningMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
            percentage >= 95
              ? "bg-rose-500/[0.06] border border-rose-500/15 text-rose-400"
              : "bg-amber-500/[0.06] border border-amber-500/15 text-amber-400"
          }`}
        >
          <span className="text-sm">⚠️</span>
          <p className="font-medium">{warningMessage}</p>
        </div>
      )}

      {/* Details breakdown */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl">
          <div className="text-[10px] text-white/25 font-bold uppercase tracking-[0.1em]">
            Prompt (In)
          </div>
          <div className="text-lg font-bold font-mono text-white/75 mt-1">
            {stats.total_prompt_tokens?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl">
          <div className="text-[10px] text-white/25 font-bold uppercase tracking-[0.1em]">
            Completion (Out)
          </div>
          <div className="text-lg font-bold font-mono text-white/75 mt-1">
            {stats.total_completion_tokens?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* History expander */}
      {stats.history && stats.history.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400/70 hover:text-indigo-400 transition-colors uppercase tracking-wider cursor-pointer"
          >
            <span>{showHistory ? "Hide Log" : "View Log"}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                showHistory ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.04] max-h-48 overflow-y-auto bg-black/20 text-[11px] animate-in slide-in-from-top-2 duration-300">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/[0.04] text-white/30">
                    <th className="px-4 py-2 font-bold uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-right">
                      Tokens
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-white/50 font-mono">
                  {stats.history
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-2 font-sans font-semibold text-white/70 whitespace-nowrap">
                          {item.task}
                        </td>
                        <td
                          className="px-4 py-2 truncate max-w-[200px]"
                          title={item.details}
                        >
                          {item.details}
                        </td>
                        <td className="px-4 py-2 text-right text-indigo-400/70 font-bold">
                          {item.total_tokens}
                        </td>
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
