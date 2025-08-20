'use client';

import { useState, useEffect } from 'react';
import { CreativeCard } from '@/components/CreativeCard';
import { DashboardStats } from '@/components/DashboardStats';
import { FilterBar } from '@/components/FilterBar';
import { Loader2 } from 'lucide-react';
import type { Creative, AnalysisStats } from '@/lib/bigquery';

export default function Dashboard() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [stats, setStats] = useState<AnalysisStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'usage'>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchCreatives = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: (page * 50).toString(),
        sortBy,
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/creatives?${params}`);
      const data = await response.json();

      // Ensure data is an array
      const creativesArray = Array.isArray(data) ? data : [];

      if (page === 0) {
        setCreatives(creativesArray);
      } else {
        setCreatives(prev => [...prev, ...creativesArray]);
      }

      setHasMore(creativesArray.length === 50);
    } catch (error) {
      console.error('Error fetching creatives:', error);
      setCreatives([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      // Ensure data is an array
      const statsArray = Array.isArray(data) ? data : [];
      setStats(statsArray);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCreatives(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [statusFilter, sortBy, page]);

  const handleAnalyze = async (contentId: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds: [contentId] }),
      });

      if (response.ok) {
        // Refresh data
        fetchCreatives();
        fetchStats();
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
    }
  };

  const handleBulkAnalyze = async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds: Array.from(selectedCreatives) }),
      });

      if (response.ok) {
        setSelectedCreatives(new Set());
        fetchCreatives();
        fetchStats();
      }
    } catch (error) {
      console.error('Error triggering bulk analysis:', error);
    }
  };

  const handleViewDetails = (creative: Creative) => {
    // TODO: Implement modal or navigation to details page
    console.log('View details:', creative);
  };

  const handleEditTags = (creative: Creative) => {
    // TODO: Implement tag editing modal
    console.log('Edit tags:', creative);
  };

  const filteredCreatives = creatives.filter(creative => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        creative.representative_creative_name?.toLowerCase().includes(query) ||
        creative.creative_tags?.some(tag => tag.toLowerCase().includes(query)) ||
        creative.content_id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Creative Analysis Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Analyze and manage ad creatives across Meta and Google Ads
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats stats={stats} />

        <FilterBar
          statusFilter={statusFilter}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onStatusChange={setStatusFilter}
          onSortChange={setSortBy}
          onSearchChange={setSearchQuery}
          onBulkAnalyze={handleBulkAnalyze}
          selectedCount={selectedCreatives.size}
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreatives.map(creative => (
                <CreativeCard
                  key={creative.content_id}
                  creative={creative}
                  onAnalyze={handleAnalyze}
                  onViewDetails={handleViewDetails}
                  onEditTags={handleEditTags}
                />
              ))}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}