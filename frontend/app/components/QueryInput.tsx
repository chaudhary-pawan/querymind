"use client";

import React, { useRef, useEffect } from "react";

interface QueryInputProps {
  value: string;
  onChange: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({
  value,
  onChange,
  onGenerate,
  loading,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(120, Math.min(el.scrollHeight, 280)) + "px";
    }
  }, [value]);

  // Cmd/Ctrl+Enter shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading && value.trim()) onGenerate();
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Textarea with gradient border */}
      <div className="gradient-border rounded-2xl">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[120px] p-5 bg-[#0a0a12] rounded-2xl text-white/90 placeholder-white/25 focus:outline-none transition-all resize-none font-mono text-sm leading-relaxed"
          placeholder="Ask a question about your data...&#10;&#10;e.g. &quot;Show the top 5 customers by total spending&quot;"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          id="query-input"
        />
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between gap-3">
        {/* Keyboard hint */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/20 font-mono select-none">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/30">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/30">
            Enter
          </kbd>
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={loading || !value.trim()}
          className="btn-shimmer px-7 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-white/[0.06] disabled:to-white/[0.06] disabled:text-white/25 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/30 active:scale-[0.97] flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
          id="generate-btn"
        >
          {loading ? (
            <>
              <div className="typing-dots flex gap-1">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-white/60">Generating...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4.5 h-4.5"
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
              Generate SQL
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default QueryInput;
