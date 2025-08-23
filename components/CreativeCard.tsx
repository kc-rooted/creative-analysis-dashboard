'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  Play, 
  Video,
  Clock,
  Image as ImageIcon,
  BadgeCheck,
  X
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

  console.log('Creative data:', creative);

  return (
    <div className="card flex flex-col h-full">
      <div className="p-8 pb-0">
        <div className="relative aspect-square rounded-xl overflow-hidden" style={{background: 'var(--bg-elevated)'}}>
          {!imageError && (creative.video_id ? creative.thumbnail_url : creative.primary_image_url) ? (
            <div className="relative w-full h-full">
              <img
                src={creative.video_id ? creative.thumbnail_url : creative.primary_image_url}
                alt={creative.representative_creative_name}
                className="w-full h-full object-cover"
                style={{
                  filter: creative.video_id ? 'blur(8px) brightness(0.85)' : 'none',
                  transform: creative.video_id ? 'scale(1.1)' : 'none'
                }}
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
              />
              {creative.video_id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-3">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="w-12 h-12" style={{color: 'var(--text-muted)'}} />
            </div>
          )}
        </div>
        
        {/* 4 centered elements section */}
        <div className="px-8 py-4 border-t border-b" style={{borderColor: 'var(--border-muted)'}}>
          <div className="flex justify-center items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1" style={{color: 'var(--text-muted)'}}>Platform</div>
              <div className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                {creative.platforms_used?.join(', ') || 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1" style={{color: 'var(--text-muted)'}}>Primary Funnel</div>
              <div className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                N/A
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1" style={{color: 'var(--text-muted)'}}>ROAS</div>
              <div className="text-sm font-semibold" style={{color: '#22c55e'}}>
                {creative.roas?.toFixed(2) || '0.00'}x
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1" style={{color: 'var(--text-muted)'}}>Analyzed</div>
              <div className="flex items-center justify-center">
                {creative.analysis_status === 'completed' ? (
                  <BadgeCheck className="w-4 h-4" style={{color: '#22c55e'}} />
                ) : (
                  <X className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-1">
        <div className="flex-1">

          {creative.creative_tags && creative.creative_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-8 justify-center">
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
        </div>

        <div className="flex gap-2 mt-auto justify-center">
          <button
            onClick={() => router.push(`/creative/${encodeURIComponent(creative.content_id)}`)}
            className="btn-primary px-3 py-2 text-sm font-medium flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>

          {creative.analysis_status === 'pending' && !creative.video_id && (
            <button
              onClick={() => onAnalyze(creative.content_id)}
              disabled={isAnalyzing}
              className="btn-secondary px-3 py-2 text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="btn-secondary px-3 py-2 text-sm font-medium flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
            >
              <Clock className="w-4 h-4 animate-spin" />
              Analyzing...
            </button>
          )}

        </div>
      </div>
    </div>
  );
}