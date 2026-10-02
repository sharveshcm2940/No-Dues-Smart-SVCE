import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export const DataTable = ({
  columns = [],
  data = [],
  searchPlaceholder = 'Search records...',
  filterOptions = [],
  filterKey = '',
  actions = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Search and Filter Logic
  const filteredData = data.filter((row) => {
    const matchesSearch = Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });

    const matchesFilter =
      selectedFilter === 'ALL' ||
      !filterKey ||
      String(row[filterKey] || '').toLowerCase() === selectedFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* Search & Filter Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-2xs"
            />
          </div>

          {filterOptions.length > 0 && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {actions && <div className="self-end sm:self-auto">{actions}</div>}
      </div>

      {/* Table Body with horizontal scroll indicator on mobile */}
      <div className="overflow-x-auto touch-pan-x">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              {columns.map((col, idx) => (
                <th key={idx} className="px-3.5 sm:px-4 py-3 font-semibold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-xs">No records found</p>
                    <p className="text-[11px] text-slate-400">Try refining your search or filter options.</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentData.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-3.5 sm:px-4 py-3 whitespace-nowrap">
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 font-medium">
        <div className="text-center sm:text-left text-[11px] sm:text-xs">
          Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-transform"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-bold text-slate-700 text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-transform"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default DataTable;
