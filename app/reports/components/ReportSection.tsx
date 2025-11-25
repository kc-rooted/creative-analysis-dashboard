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
    <div className="card p-4" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <h3 className="text-xl font-bold mb-3" style={{ color: '#000000' }}>
        {adName}
      </h3>

      <img
        src={imageUrl}
        alt={adName}
        className="w-full aspect-square object-cover rounded mb-3"
        style={{ background: '#f3f4f6' }}
      />

      <div className="grid grid-cols-2 gap-2">
        {metrics.allStarRank !== null && metrics.allStarRank !== undefined && (
          <h4 className="text-base font-semibold" style={{ color: '#000000' }}>
            Rank: <span className="font-bold">#{metrics.allStarRank}</span>
          </h4>
        )}
        {metrics.roas !== null && metrics.roas !== undefined && (
          <h4 className="text-base font-semibold" style={{ color: '#000000' }}>
            ROAS: <span className="font-bold">{metrics.roas.toFixed(2)}x</span>
          </h4>
        )}
        {metrics.ctr !== null && metrics.ctr !== undefined && (
          <h4 className="text-base font-semibold" style={{ color: '#000000' }}>
            CTR: <span className="font-bold">{metrics.ctr.toFixed(2)}%</span>
          </h4>
        )}
        {metrics.cpc !== null && metrics.cpc !== undefined && (
          <h4 className="text-base font-semibold" style={{ color: '#000000' }}>
            CPC: <span className="font-bold">${metrics.cpc.toFixed(2)}</span>
          </h4>
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
