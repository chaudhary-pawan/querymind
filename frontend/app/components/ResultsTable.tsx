import React, { useState } from 'react';

interface ResultsTableProps {
  data: any[];
  onCellEdit?: (rowIndex: number, column: string, newValue: any) => void;
  tableName?: string;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data, onCellEdit, tableName }) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  if (!data || data.length === 0) return (
    <div className="p-8 text-center text-white/20 border border-dashed border-white/10 rounded-2xl bg-white/5">
      No data found in {tableName || 'this table'}.
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

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: string) => {
    if (e.key === 'Enter') handleSaveEdit(row, col);
    if (e.key === 'Escape') setEditingCell(null);
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl animate-in fade-in duration-500">
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/10 sticky top-0 z-10">
              {columns.map((col) => (
                <th key={col} className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider border-b border-white/10 bg-[#121212]/90 backdrop-blur-md">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors group">
                {columns.map((col) => {
                  const isEditing = editingCell?.row === i && editingCell?.col === col;
                  const value = row[col];
                  
                  return (
                    <td 
                      key={col} 
                      className={`px-6 py-4 text-sm whitespace-nowrap transition-all ${
                        onCellEdit && col !== 'id' ? 'cursor-pointer hover:bg-blue-500/10' : ''
                      }`}
                      onClick={() => col !== 'id' && handleStartEdit(i, col, value)}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          className="bg-blue-600/20 border border-blue-500/50 rounded px-2 py-1 text-white outline-none w-full"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(i, col)}
                          onKeyDown={(e) => handleKeyDown(e, i, col)}
                        />
                      ) : (
                        <span className={`${value === null ? 'text-white/20 italic' : 'text-white/80'}`}>
                          {value === null ? 'null' : String(value)}
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
  );
};

export default ResultsTable;
