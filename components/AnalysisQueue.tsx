'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Activity, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useClient } from '@/components/client-provider';

interface QueueStats {
  pending_count: number;
  analyzing_count: number;
  completed_count: number;
  failed_count: number;
  queue_status: {
    [key: string]: {
      count: number;
      campaign_impact: number;
    };
  };
}

export function AnalysisQueue() {
  const { currentClient } = useClient();
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchQueueStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats', {
        headers: { 'x-client-id': currentClient || '' },
      });
      if (response.ok) {
        const data = await response.json();
        // Transform stats data to match expected format
        const pendingStats = data.find((stat: any) => stat.analysis_status === 'pending');
        const completedStats = data.find((stat: any) => stat.analysis_status === 'completed');

        setStats({
          pending_count: pendingStats?.unique_images || 0,
          analyzing_count: 0, // Not tracked in main stats
          completed_count: completedStats?.unique_images || 0,
          failed_count: 0, // Not shown anymore
          queue_status: {},
        });
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBatchAnalysis = async (limit: number = 10) => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': currentClient || '',
        },
        body: JSON.stringify({ limit }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Batch analysis completed!\n\nProcessed: ${result.results.processed}\nSuccessful: ${result.results.successful}\nFailed: ${result.results.failed}`);
        
        // Refresh stats
        await fetchQueueStats();
      } else {
        const error = await response.json();
        alert(`Analysis failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting batch analysis:', error);
      alert('Failed to start batch analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchQueueStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats && !loading) {
    return null;
  }

  return (
    <div className="card p-10 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
            <Activity className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
            Batch Analysis
          </h2>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>
            Process multiple pending creatives with Claude analysis
          </p>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{borderBottomColor: 'var(--accent-primary)'}}></div>
        </div>
      ) : stats && stats.pending_count > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                {formatNumber(stats.pending_count)} creatives ready for analysis
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startBatchAnalysis(5)}
                disabled={analyzing}
                className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Analyze 5
              </button>
              <button
                onClick={() => startBatchAnalysis(10)}
                disabled={analyzing}
                className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                style={{background: '#22c55e'}}
              >
                <Play className="w-4 h-4" />
                Analyze 10
              </button>
              <button
                onClick={() => startBatchAnalysis(25)}
                disabled={analyzing}
                className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                style={{background: '#a855f7'}}
              >
                <Play className="w-4 h-4" />
                Analyze 25
              </button>
            </div>
          </div>

          {analyzing && (
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
      ) : stats && stats.pending_count === 0 && stats.completed_count > 0 ? (
        <div className="flex items-center gap-2" style={{color: '#22c55e'}}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">All creatives have been analyzed!</span>
        </div>
      ) : null}
    </div>
  );
}