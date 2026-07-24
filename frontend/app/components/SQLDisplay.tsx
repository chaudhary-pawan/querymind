"use client";

import React, { useState, useMemo } from "react";
import ConfidenceBadge from "./ConfidenceBadge";

interface SQLDisplayProps {
  sql: string;
  onExplain?: () => void;
  explaining?: boolean;
  confidence?: number;
  confidenceLabel?: string;
  confidenceReasoning?: string;
  blocked?: boolean;
}

/** Naive SQL keyword highlighter — no dependency needed */
function highlightSQL(sql: string): React.ReactNode[] {
  const KEYWORDS =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|DISTINCT|BETWEEN|LIKE|UNION|ALL|EXISTS|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|ASC|DESC|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|VIEW|WITH|RECURSIVE)\b/gi;
  const STRINGS = /('[^']*')/g;
  const NUMBERS = /\b(\d+\.?\d*)\b/g;
  const COMMENTS = /(--[^\n]*)/g;

  // Split by strings first to preserve them
  const parts = sql.split(/((?:'[^']*')|(?:--[^\n]*))/g);

  return parts.map((part, i) => {
    if (part.match(/^'.*'$/)) {
      return (
        <span key={i} className="sql-string">
          {part}
        </span>
      );
    }
    if (part.match(/^--/)) {
      return (
        <span key={i} className="sql-comment">
          {part}
        </span>
      );
    }
    // Highlight keywords and numbers in non-string parts
    const tokens = part.split(
      /(\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|DISTINCT|BETWEEN|LIKE|UNION|ALL|EXISTS|CASE|WHEN|THEN|ELSE|END|ASC|DESC|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|VIEW|WITH|RECURSIVE)\b|\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST)\b|\b\d+\.?\d*\b)/gi
    );
    return tokens.map((token, j) => {
      if (token.match(KEYWORDS)) {
        return (
          <span key={`${i}-${j}`} className="sql-keyword">
            {token}
          </span>
        );
      }
      if (
        token.match(
          /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST)\b/i
        )
      ) {
        return (
          <span key={`${i}-${j}`} className="sql-function">
            {token}
          </span>
        );
      }
      if (token.match(/^\d+\.?\d*$/)) {
        return (
          <span key={`${i}-${j}`} className="sql-number">
            {token}
          </span>
        );
      }
      return <span key={`${i}-${j}`}>{token}</span>;
    });
  });
}

const SQLDisplay: React.FC<SQLDisplayProps> = ({
  sql,
  onExplain,
  explaining,
  confidence,
  confidenceLabel,
  confidenceReasoning,
  blocked,
}) => {
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const lines = sql.split("\n");
  const highlighted = useMemo(() => highlightSQL(sql), [sql]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = sql;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-indigo-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Generated SQL
          </label>
          {confidenceLabel && confidence !== undefined && (
            <ConfidenceBadge
              confidence={confidence}
              label={confidenceLabel}
              reasoning={confidenceReasoning}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
            title="Copy SQL"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>

          {/* Explain button */}
          {onExplain && !blocked && (
            <button
              onClick={onExplain}
              disabled={explaining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {explaining ? "Explaining..." : "Explain"}
            </button>
          )}
        </div>
      </div>

      {/* Code block */}
      <div className="relative">
        <div
          className={`absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-15 transition duration-700 ${
            blocked
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-indigo-500 to-cyan-500"
          }`}
        />
        <div
          className={`relative rounded-2xl overflow-hidden border shadow-2xl ${
            blocked
              ? "bg-red-500/[0.03] border-red-500/20"
              : "bg-[#0d1117]/90 border-white/[0.06]"
          }`}
        >
          {/* Line numbers + code */}
          <div className="flex overflow-x-auto">
            {/* Line numbers gutter */}
            <div className="flex-none py-5 pl-4 pr-3 select-none border-r border-white/[0.04]">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className="text-[11px] font-mono text-white/15 leading-6 text-right min-w-[1.5rem]"
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code content */}
            <pre
              className={`flex-1 p-5 text-sm font-mono leading-6 whitespace-pre-wrap ${
                blocked ? "text-red-200/70" : "text-blue-100/90"
              }`}
            >
              <code>{highlighted}</code>
            </pre>
          </div>

          {/* Blocked badge */}
          {blocked && (
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Blocked
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SQLDisplay;
