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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Unique Images</p>
            <p className="text-2xl font-bold">{formatNumber(totalImages)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(totalImpact)} campaign uses
            </p>
          </div>
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {formatNumber(completed.unique_images)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(completed.total_campaign_impact)} campaigns
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatNumber(pending.unique_images)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(pending.total_campaign_impact)} campaigns
            </p>
          </div>
          <Clock className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Analyzing</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatNumber(analyzing.unique_images)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(analyzing.total_campaign_impact)} campaigns
            </p>
          </div>
          <Clock className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>
    </div>
  );
}