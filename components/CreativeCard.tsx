'use client';

import { useState } from 'react';
import { 
  Eye, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Tag,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { cn, formatNumber, getStatusColor } from '@/lib/utils';
import type { Creative } from '@/lib/bigquery';

interface CreativeCardProps {
  creative: Creative;
  onAnalyze: (contentId: string) => void;
  onViewDetails: (creative: Creative) => void;
  onEditTags: (creative: Creative) => void;
}

export function CreativeCard({ 
  creative, 
  onAnalyze, 
  onViewDetails,
  onEditTags 
}: CreativeCardProps) {
  const [imageError, setImageError] = useState(false);

  const getStatusIcon = () => {
    switch (creative.analysis_status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'analyzing':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        {!imageError && creative.primary_image_url ? (
          <img
            src={creative.thumbnail_url || creative.primary_image_url}
            alt={creative.representative_creative_name}
            className="w-full h-full object-cover rounded-t-lg"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          <span className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            getStatusColor(creative.analysis_status)
          )}>
            {getStatusIcon()}
            {creative.analysis_status}
          </span>
        </div>

        <div className="absolute top-2 left-2 flex gap-1">
          {creative.platforms_used?.map(platform => (
            <span 
              key={platform}
              className="px-2 py-1 bg-black/70 text-white rounded text-xs"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">
          {creative.representative_creative_name || `Creative ${creative.content_id}`}
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Users className="w-4 h-4" />
          <span>Used in {formatNumber(creative.total_usage_count)} campaigns</span>
        </div>

        {creative.creative_tags && creative.creative_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {creative.creative_tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {creative.creative_tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                +{creative.creative_tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(creative)}
            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </button>

          {creative.analysis_status === 'pending' && (
            <button
              onClick={() => onAnalyze(creative.content_id)}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-1"
            >
              <Play className="w-4 h-4" />
              Analyze
            </button>
          )}

          {creative.analysis_status === 'completed' && (
            <button
              onClick={() => onEditTags(creative)}
              className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium flex items-center justify-center gap-1"
            >
              <Tag className="w-4 h-4" />
              Edit Tags
            </button>
          )}
        </div>
      </div>
    </div>
  );
}