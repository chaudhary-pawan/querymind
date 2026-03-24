import React, { useState, useEffect } from 'react';
import ResultsTable from './ResultsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DBExplorerProps {
  onDataChange: () => void;
}

const DBExplorer: React.FC<DBExplorerProps> = ({ onDataChange }) => {
  const [tables, setTables] = useState<Record<string, any[]>>({});
  const [activeTable, setActiveTable] = useState<string>('users');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tables`);
      const data = await response.json();
      setTables(data);
    } catch (err) {
      console.error("Failed to fetch tables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCellEdit = async (rowIndex: number, col: string, newValue: any) => {
    const row = tables[activeTable][rowIndex];
    const originalValue = row[col];
    
    // Don't update if value hasn't changed
    if (String(originalValue) === String(newValue)) return;

    setUpdating(true);
    
    // Construct UPDATE query
    const sql = `UPDATE ${activeTable} SET ${col} = '${newValue}' WHERE id = ${row.id}`;
    
    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchTables();
        onDataChange(); // Notify parent to refresh if needed
      } else {
        alert("Failed to update: " + result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700">
      {/* Table Selector */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {Object.keys(tables).length > 0 ? (
          Object.keys(tables).map((tableName) => (
            <button
              key={tableName}
              onClick={() => setActiveTable(tableName)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTable === tableName 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {tableName.toUpperCase()}
            </button>
          ))
        ) : (
          <div className="px-6 py-2 text-sm text-white/20">Loading tables...</div>
        )}
      </div>

      {/* DB Status */}
      <div className="flex items-center gap-3 px-2">
        <div className={`w-2 h-2 rounded-full ${updating ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
          {updating ? 'Committing Changes...' : `Viewing Table: ${activeTable}`}
        </span>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="w-full h-64 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl animate-pulse">
           <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <ResultsTable 
          data={tables[activeTable] || []} 
          onCellEdit={handleCellEdit}
          tableName={activeTable}
        />
      )}
      
      <p className="text-[10px] text-white/20 px-2 italic">
        * Tip: Click any cell (except ID) to edit. Changes are committed instantly via SQL UPDATE.
      </p>
    </div>
  );
};

export default DBExplorer;
