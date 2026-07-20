"use client";

import { useState, useEffect } from 'react';
import QueryInput from './components/QueryInput';
import SQLDisplay from './components/SQLDisplay';
import ResultsTable from './components/ResultsTable';
import DBExplorer from './components/DBExplorer';
import GuardrailsPanel from './components/GuardrailsPanel';
import ConfirmationModal from './components/ConfirmationModal';
import SchemaWizard from './components/SchemaWizard';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const [activeTab, setActiveTab] = useState<'query' | 'explorer'>('query');
  const [question, setQuestion] = useState('');
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
      fetch(`${API_URL}/reset`, { method: 'POST' }),
      fetch(`${API_URL}/tokens`).then(res => res.json()).then(data => setTokenStats(data)).catch(err => console.error("Error fetching tokens:", err))
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

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        error: 'Failed to connect to backend',
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_URL}/tokens/reset`, { method: 'POST' });
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
      const response = await fetch(`${API_URL}/reset-default`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setLastMessage("Default database restored successfully!");
        setResult(EMPTY_RESULT);
        setQuestion('');
        setExplanation(null);
        setSandboxKey(prev => prev + 1);
        
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
    setLastMessage(`Custom sandbox database built with ${tables.length} tables!`);
    setResult(EMPTY_RESULT);
    setQuestion('');
    setExplanation(null);
    setSandboxKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a1a2e_0%,#050505_70%)] opacity-70" />
      
      <div className="relative max-w-5xl mx-auto px-6 py-12 flex flex-col items-center gap-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Image 
              src="/images/querymind.png" 
              alt="QueryMind Logo" 
              width={160} 
              height={160} 
              style={{ height: 'auto' }}
              className="relative rounded-3xl shadow-2xl mb-2 grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tight">
            Text to SQL <span className="text-blue-500/50 text-2xl font-normal ml-2 tracking-widest italic">PRO</span>
          </h1>
          <p className="text-white/30 md:text-sm max-w-md uppercase font-bold tracking-widest">
            Query & Manage your database with Groq (Llama 2) · Guardrails Enabled
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab('query')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'query' ? 'bg-white/10 shadow-inner' : 'text-white/40 hover:text-white/60'}`}
            >
              QUERY MODE
            </button>
            <button 
              onClick={() => setActiveTab('explorer')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'explorer' ? 'bg-white/10 shadow-inner' : 'text-white/40 hover:text-white/60'}`}
            >
              DATABASE EXPLORER
            </button>
        </div>

        {/* Sandbox Actions */}
        <div className="flex gap-4 flex-wrap justify-center text-xs">
          <button
            onClick={() => setIsSchemaWizardOpen(true)}
            className="px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>⚙️</span> Setup Custom Sandbox (BYOS)
          </button>
          <button
            onClick={handleRestoreDefaultDB}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 font-bold rounded-xl transition-all cursor-pointer active:scale-95"
          >
            <span>🔄</span> Restore Default Schema
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="w-full max-w-3xl flex flex-col gap-8 min-h-[500px]">
          {!resetComplete ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Initializing Sandbox...</p>
            </div>
          ) : activeTab === 'query' ? (
            <div className="flex flex-col gap-8 animate-in slide-in-from-left-4 duration-500">
              {/* Token Limit Lock Banner */}
              {tokenStats.total_tokens >= 10000 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-semibold flex items-center gap-3 animate-pulse shadow-lg">
                  <span className="text-xl">🔒</span>
                  <div>
                    <div className="font-bold">Queries Locked</div>
                    <div className="text-[11px] font-normal text-rose-400/70 mt-0.5">
                      You have exceeded the 10,000 token Groq consumption limit. Please contact the administrator to reset usage statistics.
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

              {result.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-in fade-in zoom-in-95">
                  <span className="font-bold mr-2">Error:</span>
                  {result.error}
                </div>
              )}

              {lastMessage && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm animate-in fade-in zoom-in-95">
                  {lastMessage}
                </div>
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
                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-white/70 text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-left-2 transition-all">
                       <div className="text-xs font-bold text-blue-400/50 uppercase tracking-widest mb-4">Query Explanation</div>
                      {explanation}
                    </div>
                  )}

                  {explainError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-in fade-in">
                      {explainError}
                    </div>
                  )}

                  {/* Results — only show if not blocked */}
                  {!result.blocked && (
                    <div className="flex flex-col gap-4">
                       <div className="flex items-center justify-between px-2">
                          <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
                            Results ({result.results.length} rows)
                          </label>
                       </div>
                      <ResultsTable data={result.results} />
                    </div>
                  )}

                  {/* Potential Issues */}
                  {result.potential_issues.length > 0 && !result.blocked && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl animate-in fade-in">
                      <div className="text-[10px] font-bold text-amber-400/50 uppercase tracking-widest mb-2">
                        Potential Issues
                      </div>
                      <ul className="space-y-1">
                        {result.potential_issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-amber-400/70">
                            <span className="text-amber-500 mt-0.5">•</span>
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
            <DBExplorer key={sandboxKey} onDataChange={() => setLastMessage("Record updated!")} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto py-10 text-white/10 text-[10px] font-mono tracking-widest uppercase">
          Full Stack Database Playground &bull; Powered by Groq (Llama 2) &bull; Guardrails Enabled
        </footer>
      </div>

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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}
      </style>
    </main>
  );
}
