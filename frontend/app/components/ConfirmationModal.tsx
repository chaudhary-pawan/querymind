"use client";

import React, { useEffect } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  sql: string;
  confidence: number;
  confidenceLabel: string;
  reasoning: string;
  potentialIssues: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  sql,
  confidence,
  confidenceLabel,
  reasoning,
  potentialIssues,
  onConfirm,
  onCancel,
}) => {
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* Warning header */}
        <div className="bg-amber-500/[0.06] border-b border-amber-500/15 px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center animate-shake">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-400">
              Low Confidence Query
            </h3>
            <p className="text-[11px] text-amber-400/50 mt-0.5">
              AI is {Math.round(confidence * 100)}% confident in this
              query
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* SQL preview */}
          <div>
            <label className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">
              Generated SQL
            </label>
            <pre className="mt-2 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-blue-100/80 font-mono overflow-x-auto leading-relaxed">
              <code>{sql}</code>
            </pre>
          </div>

          {/* Reasoning */}
          {reasoning && (
            <div>
              <label className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">
                AI Assessment
              </label>
              <p className="mt-1.5 text-xs text-white/50 leading-relaxed">
                {reasoning}
              </p>
            </div>
          )}

          {/* Potential issues */}
          {potentialIssues.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">
                Potential Issues
              </label>
              <ul className="mt-1.5 space-y-1.5">
                {potentialIssues.map((issue, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-400/70"
                  >
                    <span className="text-amber-500/60 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-white/[0.04] px-6 py-4 flex items-center justify-between">
          {/* Keyboard hints */}
          <div className="hidden sm:flex items-center gap-3 text-[9px] text-white/15 font-mono">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-white/10 bg-white/5">
                Esc
              </kbd>{" "}
              cancel
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-white/10 bg-white/5">
                Ctrl
              </kbd>
              +
              <kbd className="px-1 py-0.5 rounded border border-white/10 bg-white/5">
                ↵
              </kbd>{" "}
              confirm
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-shimmer px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-400 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Execute Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
