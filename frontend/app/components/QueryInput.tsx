import React from 'react';

interface QueryInputProps {
  value: string;
  onChange: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({ value, onChange, onGenerate, loading }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative group">
        <textarea
          className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none shadow-xl backdrop-blur-sm"
          placeholder="Ask a question (e.g., 'Top 5 customers by total spending')"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
      <button
        onClick={onGenerate}
        disabled={loading || !value.trim()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        Generate Query
      </button>
    </div>
  );
};

export default QueryInput;
