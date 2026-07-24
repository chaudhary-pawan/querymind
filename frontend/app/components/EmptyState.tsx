"use client";

import React from "react";

interface EmptyStateProps {
  onSelectExample: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  { label: "Top 5 customers by spending", icon: "👥" },
  { label: "Show all products", icon: "📦" },
  { label: "Orders from last month", icon: "📅" },
  { label: "Revenue by category", icon: "📊" },
  { label: "Users who haven't ordered", icon: "🔍" },
  { label: "Average order value", icon: "💰" },
];

const EmptyState: React.FC<EmptyStateProps> = ({ onSelectExample }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-8 animate-in fade-in duration-700">
      {/* Animated SQL Icon */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 blur-2xl scale-150" />

        {/* Main icon container */}
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center"
          style={{ animation: "float 6s ease-in-out infinite" }}
        >
          {/* Database icon - CSS art */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="drop-shadow-lg"
          >
            {/* Database cylinder top */}
            <ellipse cx="24" cy="14" rx="14" ry="5" fill="rgba(99,102,241,0.3)" stroke="rgba(129,140,248,0.6)" strokeWidth="1.5" />
            {/* Body */}
            <path d="M10 14v20c0 2.76 6.27 5 14 5s14-2.24 14-5V14" stroke="rgba(129,140,248,0.6)" strokeWidth="1.5" fill="none" />
            {/* Middle ring */}
            <path d="M10 24c0 2.76 6.27 5 14 5s14-2.24 14-5" stroke="rgba(129,140,248,0.3)" strokeWidth="1" fill="none" />
            {/* Sparkle */}
            <circle cx="35" cy="11" r="2" fill="rgba(6,182,212,0.6)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Query arrow */}
            <path d="M24 26l6-4M24 26l6 4" stroke="rgba(6,182,212,0.8)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>

          {/* Corner decorations */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/40 blur-sm" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-indigo-400/40 blur-sm" />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <h2 className="text-xl font-bold text-white/90 tracking-tight">
          Ask anything about your database
        </h2>
        <p className="text-sm text-white/35 leading-relaxed">
          Type a natural language question and QueryMind will generate, validate,
          and execute the SQL for you — with guardrails.
        </p>
      </div>

      {/* Example Query Chips */}
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          Try an example
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example.label}
              onClick={() => onSelectExample(example.label)}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] text-white/50 hover:text-white/80 text-xs font-medium transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="text-sm group-hover:scale-110 transition-transform duration-200">
                {example.icon}
              </span>
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center gap-2 text-[10px] text-white/15 font-mono">
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
          ⌘
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
          Enter
        </kbd>
        <span className="ml-1">to generate</span>
      </div>
    </div>
  );
};

export default EmptyState;
