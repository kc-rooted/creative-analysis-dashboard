'use client';

import { 
  ImageIcon, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { AnalysisStats } from '@/lib/bigquery';

interface DashboardStatsProps {
  stats: AnalysisStats[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const getStatByStatus = (status: string) => {
    return stats.find(s => s.analysis_status === status) || { 
      unique_images: 0, 
      total_campaign_impact: 0 
    };
  };

  const totalImages = stats.reduce((sum, s) => sum + s.unique_images, 0);
  const totalImpact = stats.reduce((sum, s) => sum + s.total_campaign_impact, 0);
  const completed = getStatByStatus('completed');
  const pending = getStatByStatus('pending');
  const analyzing = getStatByStatus('analyzing');
  const failed = getStatByStatus('failed');

  const completionRate = totalImages > 0 
    ? Math.round((completed.unique_images / totalImages) * 100) 
    : 0;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="card p-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Unique Images</p>
            <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{formatNumber(totalImages)}</p>
            <p className="text-xs mt-1" style={{color: 'var(--text-disabled)'}}>
              {formatNumber(totalImpact)} campaign uses
            </p>
          </div>
          <ImageIcon className="w-8 h-8" style={{color: 'var(--text-muted)'}} />
        </div>
      </div>

      <div className="card p-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Completed</p>
            <p className="text-2xl font-bold" style={{color: '#22c55e'}}>
              {formatNumber(completed.unique_images)}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--text-disabled)'}}>
              {formatNumber(completed.total_campaign_impact)} campaigns
            </p>
          </div>
          <CheckCircle className="w-8 h-8" style={{color: '#22c55e'}} />
        </div>
      </div>

      <div className="card p-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Pending</p>
            <p className="text-2xl font-bold" style={{color: '#eab308'}}>
              {formatNumber(pending.unique_images)}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--text-disabled)'}}>
              {formatNumber(pending.total_campaign_impact)} campaigns
            </p>
          </div>
          <Clock className="w-8 h-8" style={{color: '#eab308'}} />
        </div>
      </div>

      <div className="card p-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Analyzing</p>
            <p className="text-2xl font-bold" style={{color: 'var(--accent-primary)'}}>
              {formatNumber(analyzing.unique_images)}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--text-disabled)'}}>
              {formatNumber(analyzing.total_campaign_impact)} campaigns
            </p>
          </div>
          <Clock className="w-8 h-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
        </div>
      </div>

      <div className="card p-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Completion Rate</p>
            <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{completionRate}%</p>
            <div className="w-full rounded-full h-2 mt-2" style={{background: 'var(--border-muted)'}}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${completionRate}%`,
                  background: 'linear-gradient(90deg, #22c55e, var(--accent-primary))'
                }}
              />
            </div>
          </div>
          <TrendingUp className="w-8 h-8" style={{color: '#22c55e'}} />
        </div>
      </div>
    </div>
  );
}