"use client";

import React, { useState } from "react";

interface ResultsTableProps {
  data: any[];
  onCellEdit?: (rowIndex: number, column: string, newValue: any) => void;
  tableName?: string;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  onCellEdit,
  tableName,
}) => {
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [copiedJSON, setCopiedJSON] = useState(false);

  if (!data || data.length === 0)
    return (
      <div className="p-10 text-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.02]">
        <div className="text-white/15 text-sm font-medium">
          No data found in{" "}
          <span className="font-mono text-white/25">{tableName || "this table"}</span>
        </div>
      </div>
    );

  const columns = Object.keys(data[0]);

  const handleStartEdit = (row: number, col: string, value: any) => {
    if (!onCellEdit) return;
    setEditingCell({ row, col });
    setTempValue(String(value));
  };

  const handleSaveEdit = (row: number, col: string) => {
    if (editingCell && onCellEdit) {
      onCellEdit(row, col, tempValue);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    col: string
  ) => {
    if (e.key === "Enter") handleSaveEdit(row, col);
    if (e.key === "Escape") setEditingCell(null);
  };

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">
          {data.length} {data.length === 1 ? "row" : "rows"} · {columns.length}{" "}
          {columns.length === 1 ? "column" : "columns"}
        </span>
        <button
          onClick={handleCopyJSON}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/25 hover:text-white/50 hover:bg-white/5 transition-all cursor-pointer"
        >
          {copiedJSON ? (
            <>
              <svg
                className="w-3 h-3 text-emerald-400"
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
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy JSON
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-2xl border border-white/[0.06] glass-panel shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {/* Row number header */}
                <th className="px-4 py-3.5 text-[10px] font-bold text-white/25 uppercase tracking-wider border-b border-white/[0.06] bg-white/[0.03] sticky top-0 z-10 w-10 text-center">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3.5 text-[10px] font-bold text-white/35 uppercase tracking-wider border-b border-white/[0.06] bg-white/[0.03] sticky top-0 z-10 backdrop-blur-md"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="stagger-children">
              {data.map((row, i) => (
                <tr
                  key={i}
                  className={`group transition-colors hover:bg-indigo-500/[0.04] ${
                    i % 2 === 1 ? "bg-white/[0.015]" : ""
                  }`}
                >
                  {/* Row number */}
                  <td className="px-4 py-3.5 text-[10px] font-mono text-white/15 text-center border-r border-white/[0.03]">
                    {i + 1}
                  </td>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.row === i && editingCell?.col === col;
                    const value = row[col];

                    return (
                      <td
                        key={col}
                        className={`px-5 py-3.5 text-sm whitespace-nowrap transition-all ${
                          onCellEdit && col !== "id"
                            ? "cursor-pointer hover:bg-indigo-500/[0.06]"
                            : ""
                        }`}
                        onClick={() =>
                          col !== "id" && handleStartEdit(i, col, value)
                        }
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="bg-indigo-600/20 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none w-full focus:ring-2 focus:ring-indigo-500/30 transition-all"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleSaveEdit(i, col)}
                            onKeyDown={(e) => handleKeyDown(e, i, col)}
                          />
                        ) : (
                          <span
                            className={`${
                              value === null
                                ? "text-white/15 italic font-mono text-xs"
                                : "text-white/75"
                            }`}
                          >
                            {value === null ? "NULL" : String(value)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;
