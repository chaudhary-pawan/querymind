"use client";

import React, { useState, useEffect } from "react";
import ResultsTable from "./ResultsTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DBExplorerProps {
  onDataChange: () => void;
}

const DBExplorer: React.FC<DBExplorerProps> = ({ onDataChange }) => {
  const [tables, setTables] = useState<Record<string, any[]>>({});
  const [activeTable, setActiveTable] = useState<string>("users");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tables`);
      const data = await response.json();
      setTables(data);

      const tableNames = Object.keys(data);
      if (
        tableNames.length > 0 &&
        (!activeTable ||
          !tableNames.includes(activeTable) ||
          activeTable === "users")
      ) {
        setActiveTable(tableNames[0]);
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCellEdit = async (
    rowIndex: number,
    col: string,
    newValue: any
  ) => {
    const row = tables[activeTable][rowIndex];
    const originalValue = row[col];

    // Don't update if value hasn't changed
    if (String(originalValue) === String(newValue)) return;

    setUpdating(true);

    // Construct UPDATE query
    const sql = `UPDATE ${activeTable} SET ${col} = '${newValue}' WHERE id = ${row.id}`;

    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const result = await response.json();

      if (result.success) {
        await fetchTables();
        onDataChange();
      } else {
        alert("Failed to update: " + result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTables();
    setTimeout(() => setRefreshing(false), 600);
  };

  const tableNames = Object.keys(tables);

  return (
    <div className="w-full flex flex-col gap-5 animate-in fade-in duration-700">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Table tabs */}
        <div className="flex gap-1.5 p-1 glass-panel-subtle rounded-xl overflow-x-auto">
          {tableNames.length > 0 ? (
            tableNames.map((tableName) => {
              const rowCount = tables[tableName]?.length || 0;
              const isActive = activeTable === tableName;
              return (
                <button
                  key={tableName}
                  onClick={() => setActiveTable(tableName)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Table icon */}
                  <svg
                    className={`w-3.5 h-3.5 ${isActive ? "text-white/80" : "text-white/20"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {tableName.toUpperCase()}
                  {/* Row count badge */}
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white/80"
                        : "bg-white/[0.04] text-white/25"
                    }`}
                  >
                    {rowCount}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-2 text-sm text-white/20">
              Loading tables...
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
          title="Refresh tables"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* DB Status */}
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          <div
            className={`absolute inset-0 rounded-full ${
              updating ? "bg-amber-500/40 animate-ping" : "bg-emerald-500/40 animate-ping"
            }`}
            style={{ animationDuration: "2s" }}
          />
          <div
            className={`relative w-2 h-2 rounded-full ${
              updating ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
        </div>
        <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">
          {updating
            ? "Committing changes..."
            : `Viewing: ${activeTable}`}
        </span>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center glass-panel-subtle rounded-2xl gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">
            Loading tables...
          </span>
        </div>
      ) : (
        <ResultsTable
          data={tables[activeTable] || []}
          onCellEdit={handleCellEdit}
          tableName={activeTable}
        />
      )}

      <p className="text-[10px] text-white/15 px-1 italic flex items-center gap-1.5">
        <svg className="w-3 h-3 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Click any cell (except ID) to edit. Changes are committed instantly.
      </p>
    </div>
  );
};

export default DBExplorer;
