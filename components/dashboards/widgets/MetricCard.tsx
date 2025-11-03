'use client';

import { MetricData, DateRange } from '@/types/dashboard';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  metric: MetricData;
  dateRange: DateRange;
  className?: string;
}

export default function MetricCard({ metric, dateRange, className = '' }: MetricCardProps) {
  const change = metric.current - (metric.previous || 0);
  const changePercent = metric.previous
    ? ((change / metric.previous) * 100)
    : 0;

  const isPositive = change > 0;
  const isTargetMet = metric.target ? metric.current >= metric.target : false;

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else if (metric.label.includes('Rate') || metric.label.includes('%')) {
      return `${value.toFixed(1)}%`;
    } else if (metric.label.includes('Time')) {
      return `${value.toFixed(1)}h`;
    } else if (value >= 1000) {
      return value.toLocaleString();
    }
    return value.toFixed(2);
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            {metric.label}
          </h3>
          {metric.target && (
            <div className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
              isTargetMet
                ? 'tag-accent'
                : ''
            }`} style={!isTargetMet ? {
              background: 'var(--accent-bg)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--accent-border)'
            } : {}}>
              <TrendingUp className="h-3 w-3 mr-1" />
              Target: {formatValue(metric.target)}
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="space-y-2">
          <div className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
            {formatValue(metric.current)}
          </div>

          {/* Change Indicator */}
          {metric.previous && (
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center text-sm`}
                style={{color: isPositive ? '#22c55e' : '#b55c5c'}}
              >
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(changePercent).toFixed(1)}%
              </div>
              <span className="text-sm" style={{color: 'var(--text-muted)'}}>
                vs. previous period
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar (if target exists) */}
        {metric.target && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
              <span>Progress to Target</span>
              <span>{((metric.current / metric.target) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{background: 'var(--border-muted)'}}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((metric.current / metric.target) * 100, 100)}%`,
                  background: isTargetMet ? '#22c55e' : 'var(--accent-primary)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}