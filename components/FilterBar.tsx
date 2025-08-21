'use client';

import { Filter, SortAsc, Search } from 'lucide-react';

interface FilterBarProps {
  statusFilter: string;
  platformFilter: string;
  sortBy: 'priority' | 'date' | 'usage' | 'roas' | 'analyzed';
  searchQuery: string;
  onStatusChange: (status: string) => void;
  onPlatformChange: (platform: string) => void;
  onSortChange: (sort: 'priority' | 'date' | 'usage' | 'roas' | 'analyzed') => void;
  onSearchChange: (query: string) => void;
  onBulkAnalyze: () => void;
  selectedCount: number;
}

export function FilterBar({
  statusFilter,
  platformFilter,
  sortBy,
  searchQuery,
  onStatusChange,
  onPlatformChange,
  onSortChange,
  onSearchChange,
  onBulkAnalyze,
  selectedCount
}: FilterBarProps) {
  return (
    <div className="card px-8 py-7 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{color: 'var(--text-muted)'}} />
          <input
            type="text"
            placeholder="Search creatives..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-5 py-4 transition-all duration-200"
            style={{
              borderRadius: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-5 py-4 transition-all duration-200"
              style={{
                borderRadius: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="analyzing">Analyzing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="px-5 py-4 transition-all duration-200"
              style={{
                borderRadius: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="google_ads">Google Ads</option>
              <option value="both">Both Platforms</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <SortAsc className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'priority' | 'date' | 'usage' | 'roas' | 'analyzed')}
              className="px-5 py-4 transition-all duration-200"
              style={{
                borderRadius: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="roas">ROAS</option>
              <option value="priority">Priority</option>
              <option value="usage">Usage Count</option>
              <option value="analyzed">Analyzed</option>
              <option value="date">Last Updated</option>
            </select>
          </div>

          {selectedCount > 0 && (
            <button
              onClick={onBulkAnalyze}
              className="btn-primary flex items-center gap-2"
            >
              Analyze {selectedCount} Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}