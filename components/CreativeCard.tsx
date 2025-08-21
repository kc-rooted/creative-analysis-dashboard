'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  isAnalyzing?: boolean;
}

export function CreativeCard({ 
  creative, 
  onAnalyze, 
  onViewDetails,
  onEditTags,
  isAnalyzing = false
}: CreativeCardProps) {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

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
    <div className="card">
      <div className="p-8 pb-0">
        <div className="relative aspect-square rounded-xl overflow-hidden" style={{background: 'var(--bg-elevated)'}}>
          {!imageError && (creative.video_id ? creative.thumbnail_url : creative.primary_image_url) ? (
            <div className="relative w-full h-full">
              <img
                src={creative.video_id ? creative.thumbnail_url : creative.primary_image_url}
                alt={creative.representative_creative_name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
              />
              {creative.video_id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-3">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="w-12 h-12" style={{color: 'var(--text-muted)'}} />
            </div>
          )}
          
          {!creative.video_id && (
            <div className="absolute top-2 right-2">
              <span className="tag tag-accent flex items-center gap-1">
                {getStatusIcon()}
                {creative.analysis_status}
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1">
            {creative.platforms_used?.map(platform => (
              <span 
                key={platform}
                className="tag"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2" style={{color: 'var(--text-primary)'}}>
          {creative.cleaned_creative_name || creative.representative_creative_name || `Creative ${creative.content_id}`}
        </h3>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm" style={{color: 'var(--text-secondary)'}}>
            <Users className="w-4 h-4" />
            <span>Used in {formatNumber(creative.total_campaigns)} campaigns</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{color: 'var(--text-secondary)'}}>
            <span className="font-medium">ROAS:</span>
            <span className="font-semibold" style={{color: '#22c55e'}}>{creative.roas?.toFixed(2) || '0.00'}x</span>
          </div>
        </div>

        {creative.creative_tags && creative.creative_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {creative.creative_tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="tag"
              >
                {tag}
              </span>
            ))}
            {creative.creative_tags.length > 3 && (
              <span className="tag">
                +{creative.creative_tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/creative/${encodeURIComponent(creative.content_id)}`)}
            className="btn-primary flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>

          {creative.analysis_status === 'pending' && !creative.video_id && (
            <button
              onClick={() => onAnalyze(creative.content_id)}
              disabled={isAnalyzing}
              className="btn-secondary flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          )}

          {creative.analysis_status === 'analyzing' && (
            <button
              disabled
              className="btn-secondary flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
            >
              <Clock className="w-4 h-4 animate-spin" />
              Analyzing...
            </button>
          )}

          {creative.analysis_status === 'completed' && (
            <button
              onClick={() => onEditTags(creative)}
              className="btn-secondary flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1"
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