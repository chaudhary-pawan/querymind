"use client";

import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number;
  label: string;
  reasoning?: string;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, label, reasoning }) => {
  const config = {
    HIGH: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    MEDIUM: {
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-400",
      dot: "bg-amber-400",
      glow: "shadow-amber-500/20",
    },
    LOW: {
      bg: "bg-red-500/15",
      border: "border-red-500/30",
      text: "text-red-400",
      dot: "bg-red-400 animate-pulse",
      glow: "shadow-red-500/20",
    },
  }[label] || {
    bg: "bg-white/10",
    border: "border-white/20",
    text: "text-white/60",
    dot: "bg-white/40",
    glow: "",
  };

  return (
    <div className="group relative inline-flex">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all ${config.bg} ${config.border} ${config.text} ${config.glow} shadow-lg`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{label}</span>
        <span className="opacity-50 font-mono">{Math.round(confidence * 100)}%</span>
      </div>

      {/* Tooltip with reasoning */}
      {reasoning && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-white/70 w-72 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-50">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
            Confidence Reasoning
          </div>
          <p className="leading-relaxed">{reasoning}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a2e]/95 border-r border-b border-white/10 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
};

export default ConfidenceBadge;
