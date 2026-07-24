"use client";

import React, { useEffect, useState } from "react";

interface ConfidenceBadgeProps {
  confidence: number;
  label: string;
  reasoning?: string;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  label,
  reasoning,
}) => {
  const [mounted, setMounted] = useState(false);
  const percentage = Math.round(confidence * 100);

  useEffect(() => {
    // Trigger ring animation on mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const config = {
    HIGH: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      ring: "#10b981",
    },
    MEDIUM: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      ring: "#f59e0b",
    },
    LOW: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
      ring: "#ef4444",
    },
  }[label] || {
    bg: "bg-white/10",
    border: "border-white/20",
    text: "text-white/60",
    ring: "#6b7280",
  };

  // SVG ring calculation
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = mounted
    ? circumference - (percentage / 100) * circumference
    : circumference;

  return (
    <div className="group relative inline-flex">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all ${config.bg} ${config.border} ${config.text}`}
      >
        {/* Mini radial gauge */}
        <svg width="24" height="24" className="flex-none -ml-0.5">
          {/* Background track */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            opacity="0.15"
          />
          {/* Progress ring */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke={config.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 12 12)"
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {/* Center text */}
          <text
            x="12"
            y="12"
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            fontSize="7"
            fontWeight="700"
            fontFamily="monospace"
          >
            {percentage}
          </text>
        </svg>

        <span>{label}</span>
      </div>

      {/* Tooltip with reasoning */}
      {reasoning && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 glass-panel rounded-xl text-xs text-white/70 w-72 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-50">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-1.5">
            Confidence Reasoning
          </div>
          <p className="leading-relaxed">{reasoning}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0d1117] border-r border-b border-white/[0.08] rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
};

export default ConfidenceBadge;
