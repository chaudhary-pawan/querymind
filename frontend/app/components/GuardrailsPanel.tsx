"use client";

import React, { useState, useRef, useEffect } from "react";

interface PipelineStep {
  step: string;
  status: string;
  duration_ms: number;
  detail: string;
}

interface GuardrailsCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface GuardrailsPanelProps {
  steps: PipelineStep[];
  checks: GuardrailsCheck[];
  blocked: boolean;
  blockedReason?: string;
}

const STEP_LABELS: Record<string, string> = {
  schema_filter: "Schema Introspection",
  injection_scan: "Injection Scan",
  sql_generation: "SQL Generation (Gemini)",
  sql_validation: "SQL Validation (sqlglot)",
  guardrails_check: "Guardrails AI Check",
  execution: "Sandboxed Execution",
  confidence_score: "Confidence Scoring",
  pipeline: "Pipeline",
};

const STEP_ICONS: Record<string, string> = {
  schema_filter: "🗄️",
  injection_scan: "🛡️",
  sql_generation: "✨",
  sql_validation: "🔍",
  guardrails_check: "🚧",
  execution: "⚡",
  confidence_score: "📊",
  pipeline: "⚠️",
};

const STATUS_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  ok: { icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  blocked: { icon: "✕", color: "text-red-400", bg: "bg-red-500/10" },
  error: { icon: "!", color: "text-amber-400", bg: "bg-amber-500/10" },
  skipped: { icon: "—", color: "text-white/30", bg: "bg-white/5" },
};

const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({
  steps,
  checks,
  blocked,
  blockedReason,
}) => {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, steps, checks]);

  if (!steps || steps.length === 0) return null;

  const totalMs = steps.reduce((sum, s) => sum + s.duration_ms, 0);
  const allPassed = steps.every((s) => s.status === "ok");

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all cursor-pointer group ${
          blocked
            ? "bg-red-500/[0.06] border-red-500/15 hover:bg-red-500/[0.1]"
            : allPassed
            ? "bg-emerald-500/[0.06] border-emerald-500/15 hover:bg-emerald-500/[0.1]"
            : "bg-amber-500/[0.06] border-amber-500/15 hover:bg-amber-500/[0.1]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {blocked ? "🚫" : allPassed ? "🛡️" : "⚠️"}
          </span>
          <div className="text-left">
            <div
              className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
                blocked
                  ? "text-red-400"
                  : allPassed
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {blocked
                ? "Query Blocked by Guardrails"
                : allPassed
                ? "All Guardrails Passed"
                : "Guardrails Warning"}
            </div>
            <div className="text-[10px] text-white/25 mt-0.5 font-mono">
              {steps.length} steps · {totalMs}ms total
            </div>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-white/20 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
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

      {/* Smooth expand/collapse */}
      <div
        className="overflow-hidden transition-all duration-350 ease-in-out"
        style={{
          maxHeight: expanded ? contentHeight + 20 : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="mt-2 p-4 glass-panel-subtle rounded-2xl space-y-1">
          {/* Pipeline Steps with timeline */}
          <div className="relative">
            {steps.map((step, i) => {
              const statusStyle =
                STATUS_STYLES[step.status] || STATUS_STYLES.error;
              const label = STEP_LABELS[step.step] || step.step;
              const icon = STEP_ICONS[step.step] || "⚙️";
              const isLast = i === steps.length - 1;

              return (
                <div key={i} className="flex gap-3 relative">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    {/* Dot */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${statusStyle.bg} ${statusStyle.color} border-current/20 z-10 relative`}
                    >
                      {statusStyle.icon}
                    </div>
                    {/* Line */}
                    {!isLast && (
                      <div className="w-px h-full bg-white/[0.06] min-h-[16px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{icon}</span>
                        <span className="text-xs font-semibold text-white/70">
                          {label}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/25 truncate mt-0.5 ml-6">
                        {step.detail}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white/15 tabular-nums whitespace-nowrap flex-none mt-0.5">
                      {step.duration_ms}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guardrails Checks */}
          {checks.length > 0 && (
            <>
              <div className="border-t border-white/[0.04] my-3" />
              <div className="px-1 pt-1 pb-2">
                <div className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] mb-2.5">
                  Validation Checks
                </div>
                <div className="flex flex-wrap gap-2">
                  {checks.map((check, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                        check.passed
                          ? "bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400"
                          : "bg-red-500/[0.06] border-red-500/15 text-red-400"
                      }`}
                      title={check.detail}
                    >
                      <span>{check.passed ? "✓" : "✕"}</span>
                      <span>{check.name.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Blocked reason */}
          {blocked && blockedReason && (
            <div className="mx-1 mt-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl text-red-400 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 flex-none mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <span className="font-bold mr-1">Blocked:</span>
                {blockedReason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardrailsPanel;
