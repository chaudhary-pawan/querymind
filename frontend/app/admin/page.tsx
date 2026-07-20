"use client";

import { useState, useEffect } from 'react';
import TokenDashboard from '../components/TokenDashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TokenHistoryItem {
  timestamp: string;
  task: string;
  details: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface TokenUsageStats {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  history: TokenHistoryItem[];
}

const DEFAULT_STATS: TokenUsageStats = {
  total_prompt_tokens: 0,
  total_completion_tokens: 0,
  total_tokens: 0,
  history: [],
};

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<TokenUsageStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);

  // Check session storage on mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem("admin_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tokens`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch token stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "Pawan" && password === "Jat") {
      setIsAuthenticated(true);
      setLoginError('');
      sessionStorage.setItem("admin_auth", "true");
      fetchStats();
    } else {
      setLoginError("Invalid Admin ID or Password");
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch(`${API_URL}/tokens/reset`, { method: 'POST' });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to reset token stats:", err);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
    setUsername('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#1a1a2e_0%,#050505_70%)] opacity-70" />
        
        <div className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
              QueryMind Admin
            </h1>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">
              Token Monitoring Authorization
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                Admin ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                placeholder="Enter Admin ID"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                placeholder="Enter password"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 text-sm"
            >
              Authorize Access
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a1a2e_0%,#050505_70%)] opacity-70" />
      
      <div className="relative max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
        {/* Admin Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tight">
              Tokens Dashboard
            </h1>
            <p className="text-white/30 text-xs uppercase tracking-widest font-bold mt-1">
              Authorized Session: Pawan
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-xs font-bold rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard contents */}
        {loading && stats.total_tokens === 0 ? (
          <div className="w-full py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <TokenDashboard stats={stats} onReset={handleReset} />
        )}
        
        {/* Back Link */}
        <div className="text-center">
          <a
            href="/"
            className="text-xs font-bold text-white/20 hover:text-white/40 uppercase tracking-widest transition-colors"
          >
            ← Back to Query Panel
          </a>
        </div>
      </div>
    </main>
  );
}
