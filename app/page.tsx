'use client';

import { useState, useEffect } from 'react';
import { CreativeCard } from '@/components/CreativeCard';
import { DashboardStats } from '@/components/DashboardStats';
import { FilterBar } from '@/components/FilterBar';
import { Loader2, Settings, Search, Filter, SortAsc, TrendingUp, ChevronDown, ChevronUp, Play, Activity, CheckCircle } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { Creative, AnalysisStats } from '@/lib/bigquery';

export default function Dashboard() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [stats, setStats] = useState<AnalysisStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'usage' | 'roas' | 'analyzed'>('roas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [analyzingCreatives, setAnalyzingCreatives] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);

  const fetchCreatives = async () => {
    try {
      const params = new URLSearchParams({
        limit: '15',
        offset: (page * 15).toString(),
        sortBy,
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/creatives?${params}`);
      const data = await response.json();

      // Ensure data is an array and deduplicate by content_id
      const creativesArray = Array.isArray(data) ? data : [];
      const deduplicatedCreatives = creativesArray.filter((creative, index, self) => 
        index === self.findIndex(c => c.content_id === creative.content_id)
      );

      if (page === 0) {
        setCreatives(deduplicatedCreatives);
      } else {
        setCreatives(prev => {
          const combined = [...prev, ...deduplicatedCreatives];
          // Deduplicate the combined array as well
          return combined.filter((creative, index, self) => 
            index === self.findIndex(c => c.content_id === creative.content_id)
          );
        });
      }

      setHasMore(creativesArray.length === 15);
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
  }, [statusFilter, platformFilter, sortBy, page]);

  const handleAnalyze = async (contentId: string) => {
    try {
      // Add to analyzing set
      setAnalyzingCreatives(prev => new Set([...prev, contentId]));
      
      // Immediately update UI to show analyzing state
      setCreatives(prev => 
        prev.map(creative => 
          creative.content_id === contentId 
            ? { ...creative, analysis_status: 'analyzing' as const }
            : creative
        )
      );

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds: [contentId] }),
      });

      // Remove from analyzing set
      setAnalyzingCreatives(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Analysis result:', result);
        
        // Update to completed status
        setCreatives(prev => 
          prev.map(creative => 
            creative.content_id === contentId 
              ? { ...creative, analysis_status: 'completed' as const }
              : creative
          )
        );
        
        // Refresh data to get the latest status and tags
        await Promise.all([fetchCreatives(), fetchStats()]);
      } else {
        // Update to failed status
        setCreatives(prev => 
          prev.map(creative => 
            creative.content_id === contentId 
              ? { ...creative, analysis_status: 'failed' as const }
              : creative
          )
        );
        
        const error = await response.json();
        console.error(`Analysis failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
      
      // Remove from analyzing set and update to failed
      setAnalyzingCreatives(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });
      
      setCreatives(prev => 
        prev.map(creative => 
          creative.content_id === contentId 
            ? { ...creative, analysis_status: 'failed' as const }
            : creative
        )
      );
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

  // Calculate stats for header
  const getStatByStatus = (status: string) => {
    return stats.find(s => s.analysis_status === status) || { 
      unique_images: 0, 
      total_campaign_impact: 0 
    };
  };

  const totalImages = stats.reduce((sum, s) => sum + s.unique_images, 0);
  const completed = getStatByStatus('completed');
  const completionRate = totalImages > 0 
    ? Math.round((completed.unique_images / totalImages) * 100) 
    : 0;

  const pending = getStatByStatus('pending');

  const startBatchAnalysis = async (limit: number = 10) => {
    try {
      setBatchAnalyzing(true);
      const response = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Batch analysis completed!\n\nProcessed: ${result.results.processed}\nSuccessful: ${result.results.successful}\nFailed: ${result.results.failed}`);
        
        // Refresh data
        await Promise.all([fetchCreatives(), fetchStats()]);
      } else {
        const error = await response.json();
        alert(`Analysis failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting batch analysis:', error);
      alert('Failed to start batch analysis');
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const filteredCreatives = creatives.filter(creative => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        creative.cleaned_creative_name?.toLowerCase().includes(query) ||
        creative.representative_creative_name?.toLowerCase().includes(query) ||
        creative.creative_tags?.some(tag => tag.toLowerCase().includes(query)) ||
        creative.content_id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Platform filter
    if (platformFilter) {
      if (platformFilter === 'both') {
        // Show only creatives that appear on both platforms
        return creative.platforms_used?.includes('facebook') && creative.platforms_used?.includes('google_ads');
      } else {
        // Show creatives that include the selected platform
        return creative.platforms_used?.includes(platformFilter);
      }
    }
    
    return true;
  });

  return (
    <div className="min-h-screen">
      <header className="w-full border-b" style={{background: 'var(--bg-card)', borderColor: 'var(--border-muted)'}}>
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 1000 1000" className="w-full h-full">
                <defs>
                  <style>
                    {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                  </style>
                </defs>
                <rect className="logo-bg" width="1000" height="1000"/>
                <g>
                  <g>
                    <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"/>
                    <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"/>
                  </g>
                  <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"/>
                </g>
              </svg>
            </div>

            {/* Right-aligned Controls */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <input
                  type="text"
                  placeholder="Search creatives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 text-sm transition-all duration-200"
                  style={{
                    borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    height: '52px',
                    width: '280px'
                  }}
                />
              </div>

              {/* Filters */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 text-sm transition-all duration-200"
                style={{
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)',
                  height: '52px'
                }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="analyzing">Analyzing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-4 text-sm transition-all duration-200"
                style={{
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)',
                  height: '52px'
                }}
              >
                <option value="">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="google_ads">Google Ads</option>
                <option value="both">Both Platforms</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'usage' | 'roas' | 'analyzed')}
                className="px-4 text-sm transition-all duration-200"
                style={{
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)',
                  height: '52px'
                }}
              >
                <option value="roas">ROAS</option>
                <option value="priority">Priority</option>
                <option value="usage">Usage Count</option>
                <option value="analyzed">Analyzed</option>
                <option value="date">Last Updated</option>
              </select>


              {/* Completion Rate Progress */}
              <div 
                className="cursor-pointer transition-all duration-200 hover:scale-105 flex items-center gap-3 px-4 rounded-xl"
                onClick={() => setShowDetailedStats(!showDetailedStats)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  minWidth: '120px',
                  height: '52px'
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{completionRate}%</p>
                    {showDetailedStats ? 
                      <ChevronUp className="w-3 h-3" style={{color: 'var(--text-muted)'}} /> :
                      <ChevronDown className="w-3 h-3" style={{color: 'var(--text-muted)'}} />
                    }
                  </div>
                  <div className="w-full rounded-full h-1" style={{background: 'var(--border-muted)'}}>
                    <div 
                      className="h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${completionRate}%`,
                        background: 'linear-gradient(90deg, #22c55e, var(--accent-primary))'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Admin Button */}
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 text-sm transition-all duration-200 flex-shrink-0"
                style={{
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-secondary)',
                  height: '52px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
              >
                <Settings className="w-4 h-4" />
                Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Collapsible Detailed Stats */}
        {showDetailedStats && (
          <div className="mb-6 card p-6 animate-in slide-in-from-top-5 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="mb-0">Detailed Analytics</h3>
              {selectedCreatives.size > 0 && (
                <button
                  onClick={handleBulkAnalyze}
                  className="btn-primary flex items-center gap-2"
                >
                  Analyze {selectedCreatives.size} Selected
                </button>
              )}
            </div>
            
            <DashboardStats stats={stats} />
            
            {/* Batch Analysis Section */}
            <div className="mt-6 pt-6" style={{borderTop: '1px solid var(--border-muted)'}}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="flex items-center gap-2 mb-1">
                    <Activity className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
                    Batch Analysis
                  </h4>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>
                    Process multiple pending creatives with Claude analysis
                  </p>
                </div>
              </div>

              {pending.unique_images > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        {formatNumber(pending.unique_images)} creatives ready for analysis
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startBatchAnalysis(5)}
                        disabled={batchAnalyzing}
                        className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Analyze 5
                      </button>
                      <button
                        onClick={() => startBatchAnalysis(10)}
                        disabled={batchAnalyzing}
                        className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                        style={{background: '#22c55e'}}
                      >
                        <Play className="w-4 h-4" />
                        Analyze 10
                      </button>
                      <button
                        onClick={() => startBatchAnalysis(25)}
                        disabled={batchAnalyzing}
                        className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                        style={{background: '#a855f7'}}
                      >
                        <Play className="w-4 h-4" />
                        Analyze 25
                      </button>
                    </div>
                  </div>

                  {batchAnalyzing && (
                    <div className="mt-4 p-4 rounded-lg" style={{background: 'var(--accent-subtle)'}}>
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 animate-spin" style={{color: 'var(--accent-primary)'}} />
                        <span className="font-medium" style={{color: 'var(--accent-primary)'}}>
                          Analysis in progress... This may take a few minutes.
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : completed.unique_images > 0 ? (
                <div className="flex items-center gap-2" style={{color: '#22c55e'}}>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">All creatives have been analyzed!</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center" style={{minHeight: 'calc(100vh - 200px)'}}>
            <div className="w-12 h-12 animate-logo-breathing">
              <svg viewBox="0 0 1000 1000" className="w-full h-full">
                <defs>
                  <style>
                    {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                  </style>
                </defs>
                <rect className="logo-bg" width="1000" height="1000"/>
                <g>
                  <g>
                    <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"/>
                    <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"/>
                  </g>
                  <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"/>
                </g>
              </svg>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreatives.map(creative => (
                <CreativeCard
                  key={creative.content_id}
                  creative={creative}
                  onAnalyze={handleAnalyze}
                  onViewDetails={handleViewDetails}
                  onEditTags={handleEditTags}
                  isAnalyzing={analyzingCreatives.has(creative.content_id)}
                />
              ))}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="btn-primary px-6 py-3 text-sm font-medium"
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