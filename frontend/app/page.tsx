"use client";

import { useState, useEffect } from "react";
import QueryInput from "./components/QueryInput";
import SQLDisplay from "./components/SQLDisplay";
import ResultsTable from "./components/ResultsTable";
import DBExplorer from "./components/DBExplorer";
import GuardrailsPanel from "./components/GuardrailsPanel";
import ConfirmationModal from "./components/ConfirmationModal";
import SchemaWizard from "./components/SchemaWizard";
import TokenDashboard from "./components/TokenDashboard";
import EmptyState from "./components/EmptyState";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

interface QueryResult {
  sql: string | null;
  results: any[];
  error: string | null;
  confidence: number;
  confidence_label: string;
  confidence_reasoning: string;
  potential_issues: string[];
  guardrails_passed: boolean;
  guardrails_checks: GuardrailsCheck[];
  pipeline_steps: PipelineStep[];
  requires_confirmation: boolean;
  blocked: boolean;
  blocked_reason: string;
}

const EMPTY_RESULT: QueryResult = {
  sql: null,
  results: [],
  error: null,
  confidence: 0,
  confidence_label: "MEDIUM",
  confidence_reasoning: "",
  potential_issues: [],
  guardrails_passed: false,
  guardrails_checks: [],
  pipeline_steps: [],
  requires_confirmation: false,
  blocked: false,
  blocked_reason: "",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"query" | "explorer">("query");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [result, setResult] = useState<QueryResult>(EMPTY_RESULT);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSchemaWizardOpen, setIsSchemaWizardOpen] = useState(false);
  const [sandboxKey, setSandboxKey] = useState(0);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenStats, setTokenStats] = useState<{
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    history: any[];
  }>({
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    history: [],
  });

  // Reset DB and fetch tokens on Refresh
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/reset`, { method: "POST" }),
      fetch(`${API_URL}/tokens`)
        .then((res) => res.json())
        .then((data) => setTokenStats(data))
        .catch((err) => console.error("Error fetching tokens:", err)),
    ]).finally(() => setResetComplete(true));
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (lastMessage) {
      const timer = setTimeout(() => setLastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  const handleGenerate = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setExplanation(null);
    setExplainError(null);
    setLastMessage(null);
    setResult(EMPTY_RESULT);
    setShowConfirmModal(false);
    setHasQueried(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data: any = await response.json();
      setResult(data);
      if (data.token_usage) {
        setTokenStats(data.token_usage);
      }

      // Show confirmation modal for low confidence
      if (data.requires_confirmation && !data.blocked) {
        setShowConfirmModal(true);
      }
    } catch (err) {
      setResult({
        ...EMPTY_RESULT,
        error: "Failed to connect to backend",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!result.sql) return;
    setExplaining(true);
    setExplainError(null);
    try {
      const response = await fetch(`${API_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: result.sql }),
      });
      const data = await response.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        if (data.token_usage) {
          setTokenStats(data.token_usage);
        }
      } else {
        setExplainError(data.detail || "Failed to explain query");
      }
    } catch (err) {
      setExplainError("Connection failed");
    } finally {
      setExplaining(false);
    }
  };

  const handleConfirmLowConfidence = () => {
    setShowConfirmModal(false);
    // Results are already in state, just dismiss the modal
  };

  const handleCancelLowConfidence = () => {
    setShowConfirmModal(false);
    setResult(EMPTY_RESULT);
  };

  const handleResetTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/tokens/reset`, {
        method: "POST",
      });
      const data = await response.json();
      setTokenStats(data);
      setLastMessage("Token statistics reset successfully!");
    } catch (err) {
      console.error("Failed to reset tokens:", err);
    }
  };

  const handleRestoreDefaultDB = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-default`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setLastMessage("Default database restored successfully!");
        setResult(EMPTY_RESULT);
        setQuestion("");
        setExplanation(null);
        setSandboxKey((prev) => prev + 1);

        // Refresh token stats
        const tokenRes = await fetch(`${API_URL}/tokens`);
        const tokenData = await tokenRes.json();
        setTokenStats(tokenData);
      }
    } catch (err) {
      console.error("Failed to restore default DB:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaWizardSuccess = (tables: string[]) => {
    setLastMessage(
      `Custom sandbox database built with ${tables.length} tables!`
    );
    setResult(EMPTY_RESULT);
    setQuestion("");
    setExplanation(null);
    setSandboxKey((prev) => prev + 1);
  };

  const handleExampleSelect = (query: string) => {
    setQuestion(query);
  };

  return (
    <main className="min-h-screen bg-[#050508] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Animated background */}
      <div className="animated-bg-grid" />

      <div className="relative flex flex-col lg:flex-row min-h-screen">
        {/* ═══════════════════════════════════════════
            LEFT SIDEBAR (desktop only)
            ═══════════════════════════════════════════ */}
        <aside className="hidden lg:flex flex-col w-80 flex-none border-r border-white/[0.04] p-6 gap-6 sticky top-0 h-screen overflow-y-auto">
          {/* Logo + branding */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <Image
                src="/images/querymind.png"
                alt="QueryMind Logo"
                width={48}
                height={48}
                style={{ height: "auto" }}
                className="relative rounded-2xl shadow-xl grayscale-[10%] group-hover:grayscale-0 transition-all duration-500"
                priority
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-white/90 tracking-tight">
                QueryMind
              </h1>
              <span className="text-[10px] font-bold text-indigo-400/40 uppercase tracking-[0.15em]">
                Text to SQL Pro
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.04]" />

          {/* Token Dashboard (compact in sidebar) */}
          <div>
            <TokenDashboard
              stats={tokenStats}
              onReset={handleResetTokens}
              compact
            />
          </div>

          {/* Sandbox Actions */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] px-1">
              Sandbox
            </span>
            <button
              onClick={() => setIsSchemaWizardOpen(true)}
              className="w-full px-4 py-2.5 glass-panel-subtle hover:bg-indigo-500/[0.06] hover:border-indigo-500/20 text-white/50 hover:text-white/80 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.97]"
            >
              <svg className="w-4 h-4 text-indigo-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Custom Sandbox (BYOS)
            </button>
            <button
              onClick={handleRestoreDefaultDB}
              className="w-full px-4 py-2.5 glass-panel-subtle hover:bg-white/[0.04] text-white/35 hover:text-white/60 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.97]"
            >
              <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restore Default Schema
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sidebar footer */}
          <div className="text-[9px] text-white/10 font-mono leading-relaxed uppercase tracking-wider">
            <div>Powered by Groq · Llama 2</div>
            <div>Guardrails Enabled</div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════
            MAIN CONTENT AREA
            ═══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* ── MOBILE HEADER (visible < lg) ── */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <Image
                src="/images/querymind.png"
                alt="QueryMind"
                width={36}
                height={36}
                style={{ height: "auto" }}
                className="rounded-xl"
                priority
              />
              <div>
                <h1 className="text-sm font-bold text-white/90">QueryMind</h1>
                <span className="text-[9px] text-indigo-400/40 uppercase tracking-widest font-bold">
                  Pro
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsSchemaWizardOpen(true)}
                className="p-2 rounded-lg glass-panel-subtle text-white/40 hover:text-white/70 transition-all cursor-pointer"
                title="Custom Sandbox"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── DESKTOP HEADER ── */}
          <div className="hidden lg:block px-8 pt-10 pb-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-white/90 tracking-tight">
                {activeTab === "query" ? "Query Mode" : "Database Explorer"}
              </h2>
              <p className="text-xs text-white/25 max-w-lg">
                {activeTab === "query"
                  ? "Transform natural language into SQL with AI guardrails and confidence scoring."
                  : "Browse, inspect, and edit your database tables directly."}
              </p>
            </div>
          </div>

          {/* ── TAB NAVIGATION ── */}
          <div className="px-4 sm:px-8 py-4">
            <div className="flex p-1 glass-panel-subtle rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("query")}
                className={`relative px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "query"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-white/35 hover:text-white/55"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                QUERY
              </button>
              <button
                onClick={() => setActiveTab("explorer")}
                className={`relative px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "explorer"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-white/35 hover:text-white/55"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                EXPLORER
              </button>
            </div>
          </div>

          {/* ── MOBILE TOKEN & SANDBOX (visible < lg) ── */}
          <div className="lg:hidden px-4 pb-4">
            <TokenDashboard
              stats={tokenStats}
              onReset={handleResetTokens}
              compact
            />
          </div>

          {/* ── DYNAMIC CONTENT ── */}
          <div className="flex-1 px-4 sm:px-8 pb-8">
            <div className="max-w-3xl flex flex-col gap-6 min-h-[400px]">
              {!resetComplete ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">
                    Initializing Sandbox...
                  </p>
                </div>
              ) : activeTab === "query" ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  {/* Token Limit Lock Banner */}
                  {tokenStats.total_tokens >= 10000 && (
                    <div className="p-4 bg-rose-500/[0.06] border border-rose-500/15 rounded-2xl text-rose-400 text-sm font-semibold flex items-center gap-3 shadow-lg">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-bold text-sm">Queries Locked</div>
                        <div className="text-[11px] font-normal text-rose-400/60 mt-0.5">
                          10,000 token limit exceeded. Contact admin to reset.
                        </div>
                      </div>
                    </div>
                  )}

                  <QueryInput
                    value={question}
                    onChange={setQuestion}
                    onGenerate={handleGenerate}
                    loading={loading || tokenStats.total_tokens >= 10000}
                  />

                  {/* Error message */}
                  {result.error && (
                    <div className="p-4 bg-red-500/[0.06] border border-red-500/15 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in zoom-in-95">
                      <svg className="w-4 h-4 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {result.error}
                    </div>
                  )}

                  {/* Success message */}
                  {lastMessage && (
                    <div className="p-4 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in zoom-in-95">
                      <svg className="w-4 h-4 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {lastMessage}
                    </div>
                  )}

                  {/* Empty state — shown when no query has been made yet */}
                  {!hasQueried && !result.sql && !result.error && !loading && (
                    <EmptyState onSelectExample={handleExampleSelect} />
                  )}

                  {result.sql && (
                    <>
                      <SQLDisplay
                        sql={result.sql}
                        onExplain={handleExplain}
                        explaining={explaining}
                        confidence={result.confidence}
                        confidenceLabel={result.confidence_label}
                        confidenceReasoning={result.confidence_reasoning}
                        blocked={result.blocked}
                      />

                      {/* Guardrails Pipeline Panel */}
                      <GuardrailsPanel
                        steps={result.pipeline_steps}
                        checks={result.guardrails_checks}
                        blocked={result.blocked}
                        blockedReason={result.blocked_reason}
                      />

                      {explanation && (
                        <div className="p-6 bg-indigo-500/[0.04] border border-indigo-500/[0.08] rounded-2xl text-white/65 text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-left-2">
                          <div className="text-[10px] font-bold text-indigo-400/40 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Query Explanation
                          </div>
                          {explanation}
                        </div>
                      )}

                      {explainError && (
                        <div className="p-4 bg-red-500/[0.06] border border-red-500/15 rounded-xl text-red-400 text-xs animate-in fade-in">
                          {explainError}
                        </div>
                      )}

                      {/* Results — only show if not blocked */}
                      {!result.blocked && (
                        <div className="flex flex-col gap-3">
                          <label className="text-[11px] font-bold text-white/25 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                            Results ({result.results.length} rows)
                          </label>
                          <ResultsTable data={result.results} />
                        </div>
                      )}

                      {/* Potential Issues */}
                      {result.potential_issues.length > 0 && !result.blocked && (
                        <div className="p-4 bg-amber-500/[0.04] border border-amber-500/[0.08] rounded-xl animate-in fade-in">
                          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Potential Issues
                          </div>
                          <ul className="space-y-1">
                            {result.potential_issues.map((issue, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-amber-400/60"
                              >
                                <span className="text-amber-500/40 mt-0.5">
                                  •
                                </span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {/* Guardrails panel even when blocked (no SQL generated) */}
                  {!result.sql && result.pipeline_steps.length > 0 && (
                    <GuardrailsPanel
                      steps={result.pipeline_steps}
                      checks={result.guardrails_checks}
                      blocked={result.blocked}
                      blockedReason={result.blocked_reason}
                    />
                  )}
                </div>
              ) : (
                <DBExplorer
                  key={sandboxKey}
                  onDataChange={() => setLastMessage("Record updated!")}
                />
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <footer className="px-8 py-6 border-t border-white/[0.03]">
            <div className="flex items-center justify-between flex-wrap gap-4 max-w-3xl">
              <div className="text-[10px] text-white/15 font-mono uppercase tracking-wider">
                QueryMind · Full-Stack Database Playground
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/10 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                  Guardrails Active
                </span>
                <span>Groq + Llama 2</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}

      {/* Confirmation Modal for Low Confidence */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        sql={result.sql || ""}
        confidence={result.confidence}
        confidenceLabel={result.confidence_label}
        reasoning={result.confidence_reasoning}
        potentialIssues={result.potential_issues}
        onConfirm={handleConfirmLowConfidence}
        onCancel={handleCancelLowConfidence}
      />

      {/* Schema Wizard Modal for BYOS Sandbox */}
      <SchemaWizard
        isOpen={isSchemaWizardOpen}
        onClose={() => setIsSchemaWizardOpen(false)}
        onSchemaSuccess={handleSchemaWizardSuccess}
      />
    </main>
  );
}
