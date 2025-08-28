'use client';

import { Instagram, Youtube, Twitter, Edit, Trash2, Mail, Phone, TrendingUp, DollarSign } from 'lucide-react';
import type { Influencer } from '@/app/influencer/page';

interface InfluencerCardProps {
  influencer: Influencer;
  onEdit: () => void;
  onDelete: () => void;
}

export function InfluencerCard({ influencer, onEdit, onDelete }: InfluencerCardProps) {
  const getPlatformIcon = () => {
    switch (influencer.platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5" />;
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      case 'twitter':
        return <Twitter className="w-5 h-5" />;
      default:
        return <Instagram className="w-5 h-5" />;
    }
  };

  const getPlatformColor = () => {
    switch (influencer.platform) {
      case 'instagram':
        return '#e11d48';
      case 'youtube':
        return '#ef4444';
      case 'tiktok':
        return '#000000';
      case 'twitter':
        return '#1da1f2';
      default:
        return 'var(--accent-primary)';
    }
  };

  const getStatusColor = () => {
    switch (influencer.status) {
      case 'active':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'inactive':
        return 'var(--text-muted)';
      default:
        return 'var(--text-muted)';
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="card p-5 hover:scale-[1.02] transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{background: `${getPlatformColor()}20`}}
          >
            <div style={{color: getPlatformColor()}}>
              {getPlatformIcon()}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg" style={{color: 'var(--text-primary)'}}>
              {influencer.name}
            </h3>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>
              @{influencer.handle}
            </p>
          </div>
        </div>
        <div 
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            background: `${getStatusColor()}20`,
            color: getStatusColor()
          }}
        >
          {influencer.status}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>Followers</p>
          <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
            {formatFollowers(influencer.followers)}
          </p>
        </div>
        <div>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>Engagement</p>
          <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
            {influencer.engagement_rate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns</p>
          <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
            {influencer.total_campaigns}
          </p>
        </div>
      </div>

      {/* Niches */}
      <div className="flex flex-wrap gap-2 mb-4">
        {influencer.niche.map((n, idx) => (
          <span
            key={idx}
            className="px-2 py-1 rounded text-xs"
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent-primary)'
            }}
          >
            {n}
          </span>
        ))}
      </div>

      {/* Contact Info */}
      {(influencer.email || influencer.phone) && (
        <div className="py-3 border-t" style={{borderColor: 'var(--border-muted)'}}>
          {influencer.email && (
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
              <a 
                href={`mailto:${influencer.email}`}
                className="text-sm truncate"
                style={{color: 'var(--text-secondary)'}}
              >
                {influencer.email}
              </a>
            </div>
          )}
          {influencer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                {influencer.phone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rate if available */}
      {influencer.rate_per_post && (
        <div className="py-3 border-t" style={{borderColor: 'var(--border-muted)'}}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{color: 'var(--text-muted)'}}>Rate per post</span>
            <span className="font-semibold" style={{color: 'var(--accent-primary)'}}>
              ${influencer.rate_per_post.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
        >
          <Edit className="w-4 h-4 inline mr-1" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-muted)',
            color: '#ef4444'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ef444420';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--border-muted)';
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}