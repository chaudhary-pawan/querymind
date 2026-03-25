"use client";

import { useState, useEffect } from 'react';
import QueryInput from './components/QueryInput';
import SQLDisplay from './components/SQLDisplay';
import ResultsTable from './components/ResultsTable';
import DBExplorer from './components/DBExplorer';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'query' | 'explorer'>('query');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ sql: string | null; results: any[]; error: string | null }>({
    sql: null,
    results: [],
    error: null,
  });
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

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
    setResult({ sql: null, results: [], error: null });

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ sql: null, results: [], error: 'Failed to connect to backend' });
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
      } else {
        setExplainError(data.detail || "Failed to explain query");
      }
    } catch (err) {
      setExplainError("Connection failed");
    } finally {
      setExplaining(false);
    }
  };

  const handleApply = async () => {
    if (!result.sql) return;
    setApplying(true);
    setLastMessage(null);
    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: result.sql }),
      });
      const data = await response.json();
      if (data.success) {
        setLastMessage(data.message || "Applied successfully!");
        if (data.results) {
           setResult(prev => ({ ...prev, results: data.results }));
        }
      } else {
        setResult(prev => ({ ...prev, error: data.error }));
      }
    } catch (err) {
      setResult(prev => ({ ...prev, error: "Failed to apply changes" }));
    } finally {
      setApplying(false);
    }
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
            Query & Manage your database with Gemini
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

        {/* Dynamic Content */}
        <div className="w-full max-w-3xl flex flex-col gap-8 min-h-[500px]">
          {activeTab === 'query' ? (
            <div className="flex flex-col gap-8 animate-in slide-in-from-left-4 duration-500">
              <QueryInput 
                value={question}
                onChange={setQuestion}
                onGenerate={handleGenerate}
                loading={loading}
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

                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between px-2">
                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
                          Results
                        </label>
                        {!result.sql.trim().toLowerCase().startsWith('select') && (
                          <button 
                            onClick={handleApply}
                            disabled={applying}
                            className="bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-500 text-[10px] font-bold py-1 px-3 rounded-full transition-all flex items-center gap-2"
                          >
                            {applying ? 'Applying...' : 'Apply to Database'}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                     </div>
                    <ResultsTable data={result.results} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <DBExplorer onDataChange={() => setLastMessage("Record updated!")} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto py-10 text-white/10 text-[10px] font-mono tracking-widest uppercase">
          Full Stack Database Playground &bull; Powered by Deepmind Gemini
        </footer>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </main>
  );
}
