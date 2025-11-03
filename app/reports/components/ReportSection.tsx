'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
}

export function KPICard({ title, value, change, changeDirection }: KPICardProps) {
  return (
    <div className="card p-4" style={{ background: 'var(--bg-card)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {change && (
        <div
          className="text-sm mt-1"
          style={{
            color: changeDirection === 'up' ? '#4ade80' :
                   changeDirection === 'down' ? '#f87171' :
                   'var(--text-muted)'
          }}
        >
          {change}
        </div>
      )}
    </div>
  );
}

interface AdCreativeCardProps {
  adName: string;
  imageUrl: string;
  metrics: {
    roas?: number;
    ctr?: number;
    cpc?: number;
    allStarRank?: number;
  };
}

export function AdCreativeCard({ adName, imageUrl, metrics }: AdCreativeCardProps) {
  return (
    <div className="card p-4" style={{ background: 'var(--bg-card)' }}>
      <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {adName}
      </div>

      <img
        src={imageUrl}
        alt={adName}
        className="w-full h-48 object-cover rounded mb-3"
        style={{ background: 'var(--bg-elevated)' }}
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        {metrics.allStarRank && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Rank: </span>
            <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
              #{metrics.allStarRank}
            </span>
          </div>
        )}
        {metrics.roas && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>ROAS: </span>
            <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
              {metrics.roas.toFixed(2)}x
            </span>
          </div>
        )}
        {metrics.ctr && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>CTR: </span>
            <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
              {metrics.ctr.toFixed(2)}%
            </span>
          </div>
        )}
        {metrics.cpc && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>CPC: </span>
            <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
              ${metrics.cpc.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReportSectionProps {
  title: string;
  type: 'static' | 'ai-generated' | 'hybrid';
  children: React.ReactNode;
}

export function ReportSection({ title, type, children }: ReportSectionProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
