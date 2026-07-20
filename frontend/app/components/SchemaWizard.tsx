"use client";

import React, { useState } from 'react';

interface SchemaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaSuccess: (tables: string[]) => void;
}

interface VisualColumn {
  name: string;
  type: "INTEGER" | "TEXT" | "REAL" | "DATETIME";
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

interface VisualTable {
  name: string;
  columns: VisualColumn[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SchemaWizard: React.FC<SchemaWizardProps> = ({ isOpen, onClose, onSchemaSuccess }) => {
  const [activeMode, setActiveMode] = useState<'ai' | 'visual' | 'sql'>('ai');
  const [density, setDensity] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');

  // Mode 1: AI Prompt
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedDdl, setGeneratedDdl] = useState('');

  // Mode 2: Raw SQL DDL
  const [rawDdl, setRawDdl] = useState('');

  // Mode 3: No-Code Visual Builder state
  const [visualTables, setVisualTables] = useState<VisualTable[]>([
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
        { name: 'email', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  ]);

  if (!isOpen) return null;

  // --- Visual Builder Helpers ---
  const addTable = () => {
    setVisualTables([
      ...visualTables,
      {
        name: `new_table_${visualTables.length + 1}`,
        columns: [{ name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false }],
      },
    ]);
  };

  const removeTable = (tableIdx: number) => {
    setVisualTables(visualTables.filter((_, idx) => idx !== tableIdx));
  };

  const updateTableName = (tableIdx: number, newName: string) => {
    const updated = [...visualTables];
    updated[tableIdx].name = newName.replace(/[^a-zA-Z0-9_]/g, '');
    setVisualTables(updated);
  };

  const addColumn = (tableIdx: number) => {
    const updated = [...visualTables];
    updated[tableIdx].columns.push({
      name: `col_${updated[tableIdx].columns.length + 1}`,
      type: 'TEXT',
      isPrimaryKey: false,
      isForeignKey: false,
    });
    setVisualTables(updated);
  };

  const removeColumn = (tableIdx: number, colIdx: number) => {
    const updated = [...visualTables];
    updated[tableIdx].columns = updated[tableIdx].columns.filter((_, idx) => idx !== colIdx);
    setVisualTables(updated);
  };

  const updateColumn = (tableIdx: number, colIdx: number, key: keyof VisualColumn, value: any) => {
    const updated = [...visualTables];
    updated[tableIdx].columns[colIdx] = {
      ...updated[tableIdx].columns[colIdx],
      [key]: value,
    };
    setVisualTables(updated);
  };

  const compileVisualToDDL = (): string => {
    return visualTables
      .map((table) => {
        const tableName = table.name.trim() || 'unnamed_table';
        const colDefs = table.columns.map((col) => {
          let def = `${col.name.trim()} ${col.type}`;
          if (col.isPrimaryKey) def += ' PRIMARY KEY';
          return def;
        });

        // Add relational foreign keys
        table.columns.forEach((col) => {
          if (col.isForeignKey && col.referencesTable && col.referencesColumn) {
            colDefs.push(
              `FOREIGN KEY (${col.name.trim()}) REFERENCES ${col.referencesTable.trim()}(${col.referencesColumn.trim()})`
            );
          }
        });

        return `CREATE TABLE ${tableName} (\n  ${colDefs.join(',\n  ')}\n);`;
      })
      .join('\n\n');
  };

  // --- API Handlers ---

  const handleAIGenerateDDL = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    setErrorText('');
    setStatusText('Architecting database schema...');
    try {
      const response = await fetch(`${API_URL}/generate-ddl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await response.json();
      if (data.success && data.ddl) {
        setGeneratedDdl(data.ddl);
        setStatusText('DDL schema generated successfully!');
      } else {
        setErrorText(data.error || 'Failed to generate schema.');
      }
    } catch (err) {
      setErrorText('Connection error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSchema = async (ddlScript: string) => {
    if (!ddlScript.trim()) return;
    setLoading(true);
    setErrorText('');
    setStatusText('Setting up SQLite sandbox...');

    try {
      // 1. Submit schema DDL to backend
      const response = await fetch(`${API_URL}/upload-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ddl: ddlScript, density }),
      });
      const data = await response.json();

      if (data.success) {
        setStatusText('Relational synthetic data generated successfully!');
        setTimeout(() => {
          onSchemaSuccess(data.tables);
          onClose();
        }, 1000);
      } else {
        setErrorText(data.error || 'Failed to initialize schema.');
      }
    } catch (err) {
      setErrorText('Connection failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Main Dialog */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Database Sandbox Creator</h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-0.5">
              Define your Custom Tables & Seed Relational Mock Data
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            ✕
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8 custom-scrollbar">
          
          {/* Left panel: Mode Selection & Explanations */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Select Mode</h4>
            
            {/* Mode Option 1: AI */}
            <button
              onClick={() => { setActiveMode('ai'); setErrorText(''); }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeMode === 'ai'
                  ? 'bg-blue-600/10 border-blue-500/30'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <span className="text-xs font-bold">AI Schema Builder</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                Describe your database needs in plain English (e.g. gym, school, shop). Groq converts it into a SQLite DDL schema script automatically.
              </p>
            </button>

            {/* Mode Option 2: Visual */}
            <button
              onClick={() => { setActiveMode('visual'); setErrorText(''); }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeMode === 'visual'
                  ? 'bg-blue-600/10 border-blue-500/30'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🛠️</span>
                <span className="text-xs font-bold">No-Code Visual Builder</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                Interactively define your columns, types (INTEGER, TEXT, REAL), and foreign keys using structured forms. No SQL knowledge required.
              </p>
            </button>

            {/* Mode Option 3: SQL DDL */}
            <button
              onClick={() => { setActiveMode('sql'); setErrorText(''); }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeMode === 'sql'
                  ? 'bg-blue-600/10 border-blue-500/30'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📄</span>
                <span className="text-xs font-bold">Raw SQL DDL</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                Upload or paste a standard `CREATE TABLE` schema script directly. Perfect for importing pre-existing database structures.
              </p>
            </button>

            {/* Seeder Config Slider */}
            <div className="mt-4 border-t border-white/5 pt-4 space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className="text-white/40">Synthetic Density</span>
                <span className="text-blue-400">{density} rows per table</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[9px] text-white/30 italic">
                * Dynamic seeder uses Groq to write custom records that match foreign key constraints.
              </p>
            </div>
          </div>

          {/* Right panel: Active Editor Workspace */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col min-h-[300px]">
            
            {/* Mode 1: AI Prompt Editor */}
            {activeMode === 'ai' && (
              <div className="flex flex-col h-full gap-4">
                <textarea
                  className="flex-1 min-h-[120px] p-4 bg-black/30 border border-white/10 rounded-2xl text-xs text-white outline-none resize-none focus:border-blue-500/50 transition-all font-sans leading-relaxed"
                  placeholder="Describe your database model... E.g., 'A student hostel management system. We need to track rooms (room number, capacity, price), students (name, email, age), and rent payments.'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={loading}
                />
                
                <button
                  onClick={handleAIGenerateDDL}
                  disabled={loading || !aiPrompt.trim()}
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Generate Schema
                </button>

                {generatedDdl && (
                  <div className="flex-1 flex flex-col gap-3 pt-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      Generated Schema Review
                    </label>
                    <pre className="flex-1 overflow-y-auto p-4 bg-black/40 border border-white/10 rounded-2xl text-[11px] font-mono text-blue-100 max-h-[180px] custom-scrollbar">
                      <code>{generatedDdl}</code>
                    </pre>
                    <button
                      onClick={() => handleUploadSchema(generatedDdl)}
                      disabled={loading}
                      className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Build Database & Generate Mock Data
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Visual Builder */}
            {activeMode === 'visual' && (
              <div className="flex flex-col h-full gap-4">
                <div className="flex-1 overflow-y-auto space-y-6 max-h-[400px] pr-2 custom-scrollbar">
                  {visualTables.map((table, tableIdx) => (
                    <div key={tableIdx} className="bg-black/20 border border-white/5 p-5 rounded-2xl relative space-y-4">
                      {/* Remove Table Button */}
                      <button
                        onClick={() => removeTable(tableIdx)}
                        className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors text-xs font-bold"
                      >
                        Delete Table
                      </button>

                      {/* Table name */}
                      <div className="w-1/2">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                          Table Name
                        </label>
                        <input
                          type="text"
                          value={table.name}
                          onChange={(e) => updateTableName(tableIdx, e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white outline-none"
                        />
                      </div>

                      {/* Columns */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                          Columns
                        </label>
                        
                        {table.columns.map((col, colIdx) => (
                          <div key={colIdx} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5 flex-wrap">
                            <input
                              type="text"
                              value={col.name}
                              onChange={(e) => updateColumn(tableIdx, colIdx, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                              className="px-2 py-1 bg-black/20 border border-white/10 rounded-lg text-[11px] text-white outline-none w-32 font-semibold"
                              placeholder="col_name"
                            />
                            
                            <select
                              value={col.type}
                              onChange={(e) => updateColumn(tableIdx, colIdx, 'type', e.target.value)}
                              className="px-2 py-1 bg-black/20 border border-white/10 rounded-lg text-[11px] text-white/80 outline-none"
                            >
                              <option value="TEXT">TEXT</option>
                              <option value="INTEGER">INTEGER</option>
                              <option value="REAL">REAL</option>
                              <option value="DATETIME">DATETIME</option>
                            </select>

                            <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={col.isPrimaryKey}
                                onChange={(e) => updateColumn(tableIdx, colIdx, 'isPrimaryKey', e.target.checked)}
                              />
                              PK
                            </label>

                            <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={col.isForeignKey}
                                onChange={(e) => updateColumn(tableIdx, colIdx, 'isForeignKey', e.target.checked)}
                              />
                              FK Link
                            </label>

                            {col.isForeignKey && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Ref Table"
                                  value={col.referencesTable || ''}
                                  onChange={(e) => updateColumn(tableIdx, colIdx, 'referencesTable', e.target.value)}
                                  className="px-2 py-1 bg-black/20 border border-white/10 rounded-lg text-[10px] text-white outline-none w-20"
                                />
                                <input
                                  type="text"
                                  placeholder="Ref Col"
                                  value={col.referencesColumn || ''}
                                  onChange={(e) => updateColumn(tableIdx, colIdx, 'referencesColumn', e.target.value)}
                                  className="px-2 py-1 bg-black/20 border border-white/10 rounded-lg text-[10px] text-white outline-none w-16"
                                />
                              </div>
                            )}

                            {colIdx > 0 && (
                              <button
                                onClick={() => removeColumn(tableIdx, colIdx)}
                                className="text-white/20 hover:text-red-400 transition-colors ml-auto text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => addColumn(tableIdx)}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        + Add Column
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={addTable}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 text-xs font-bold rounded-xl transition-all"
                  >
                    + Add New Table
                  </button>
                  <button
                    onClick={() => handleUploadSchema(compileVisualToDDL())}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Build Database
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: Raw SQL DDL Editor */}
            {activeMode === 'sql' && (
              <div className="flex flex-col h-full gap-4">
                <textarea
                  className="flex-1 min-h-[200px] p-4 bg-black/35 border border-white/10 rounded-2xl text-[11px] text-blue-100 font-mono outline-none resize-none focus:border-blue-500/50 transition-all leading-relaxed custom-scrollbar"
                  placeholder={`E.g.,\nCREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  grade REAL\n);`}
                  value={rawDdl}
                  onChange={(e) => setRawDdl(e.target.value)}
                  disabled={loading}
                />
                
                <button
                  onClick={() => handleUploadSchema(rawDdl)}
                  disabled={loading || !rawDdl.trim()}
                  className="py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Build Database & Seed
                </button>
              </div>
            )}

            {/* Status alerts */}
            {statusText && !errorText && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-xl text-center animate-pulse">
                {statusText}
              </div>
            )}

            {errorText && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                <span className="font-bold mr-1">Error:</span>
                {errorText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaWizard;
