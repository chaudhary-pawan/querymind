"use client";

import React from 'react';

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

const STATUS_STYLES: Record<string, { icon: string; color: string }> = {
  ok: { icon: "✓", color: "text-emerald-400" },
  blocked: { icon: "✕", color: "text-red-400" },
  error: { icon: "!", color: "text-amber-400" },
  skipped: { icon: "—", color: "text-white/30" },
};

const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({
  steps,
  checks,
  blocked,
  blockedReason,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!steps || steps.length === 0) return null;

  const totalMs = steps.reduce((sum, s) => sum + s.duration_ms, 0);
  const allPassed = steps.every((s) => s.status === "ok");

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all cursor-pointer group ${
          blocked
            ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/15"
            : allPassed
            ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
            : "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{blocked ? "🚫" : allPassed ? "🛡️" : "⚠️"}</span>
          <div className="text-left">
            <div className={`text-xs font-bold uppercase tracking-widest ${
              blocked ? "text-red-400" : allPassed ? "text-emerald-400" : "text-amber-400"
            }`}>
              {blocked
                ? "Query Blocked by Guardrails"
                : allPassed
                ? "All Guardrails Passed"
                : "Guardrails Warning"}
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {steps.length} steps · {totalMs}ms total
            </div>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-2 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Pipeline Steps */}
          {steps.map((step, i) => {
            const statusStyle = STATUS_STYLES[step.status] || STATUS_STYLES.error;
            const label = STEP_LABELS[step.step] || step.step;
            const icon = STEP_ICONS[step.step] || "⚙️";

            return (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                {/* Step number + icon */}
                <span className="text-base w-6 text-center">{icon}</span>

                {/* Status indicator */}
                <span className={`font-mono text-sm font-bold w-5 text-center ${statusStyle.color}`}>
                  {statusStyle.icon}
                </span>

                {/* Label + detail */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/70">{label}</div>
                  <div className="text-[10px] text-white/30 truncate">{step.detail}</div>
                </div>

                {/* Duration */}
                <span className="text-[10px] font-mono text-white/20 tabular-nums whitespace-nowrap">
                  {step.duration_ms}ms
                </span>
              </div>
            );
          })}

          {/* Guardrails Checks */}
          {checks.length > 0 && (
            <>
              <div className="border-t border-white/5 my-2" />
              <div className="px-3 pt-1 pb-2">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Validation Checks
                </div>
                <div className="flex flex-wrap gap-2">
                  {checks.map((check, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        check.passed
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
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
            <div className="mx-3 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <span className="font-bold mr-1">Blocked:</span>
              {blockedReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GuardrailsPanel;
