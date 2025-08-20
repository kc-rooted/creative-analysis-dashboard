'use client';

import { Filter, SortAsc, Search } from 'lucide-react';

interface FilterBarProps {
  statusFilter: string;
  sortBy: 'priority' | 'date' | 'usage';
  searchQuery: string;
  onStatusChange: (status: string) => void;
  onSortChange: (sort: 'priority' | 'date' | 'usage') => void;
  onSearchChange: (query: string) => void;
  onBulkAnalyze: () => void;
  selectedCount: number;
}

export function FilterBar({
  statusFilter,
  sortBy,
  searchQuery,
  onStatusChange,
  onSortChange,
  onSearchChange,
  onBulkAnalyze,
  selectedCount
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search creatives..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="analyzing">Analyzing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <SortAsc className="w-5 h-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'priority' | 'date' | 'usage')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Priority</option>
              <option value="usage">Usage Count</option>
              <option value="date">Last Updated</option>
            </select>
          </div>

          {selectedCount > 0 && (
            <button
              onClick={onBulkAnalyze}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              Analyze {selectedCount} Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}