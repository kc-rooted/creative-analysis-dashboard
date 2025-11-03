'use client';

import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { DateRange } from '@/types/dashboard';

interface PeriodData {
  value: string;
  trend: number;
}

interface KPICardProps {
  title: string;
  currentValue: string;
  previousValue?: string;
  trend: number; // percentage change
  subtitle?: string;
  periodData?: {
    sevenDay?: PeriodData;
    thirtyDay?: PeriodData;
  };
  gaugeValue: number;
  gaugeMin?: number;
  gaugeMax: number;
  gaugeTarget?: number;
  gaugeLabel: string;
  status: 'excellent' | 'good' | 'monitor' | 'warning';
  dateRange: DateRange;
  className?: string;
}

const statusConfig = {
  excellent: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: '🟢 Excellent' },
  good: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: '🟢 Good Zone' },
  monitor: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: '🟡 Monitor' },
  warning: { color: '#b55c5c', bg: 'rgba(181, 92, 92, 0.1)', label: '🔴 Warning' },
};

export default function KPICard({
  title,
  currentValue,
  previousValue,
  trend,
  subtitle,
  periodData,
  gaugeValue,
  gaugeMin = 0,
  gaugeMax,
  gaugeTarget,
  gaugeLabel,
  status,
  dateRange,
  className = ''
}: KPICardProps) {
  const isPositive = trend > 0;
  const config = statusConfig[status];

  // Handle gauges with min/max range (e.g., 25% - 45%)
  const gaugeRange = gaugeMax - gaugeMin;
  const normalizedValue = Math.max(gaugeMin, Math.min(gaugeMax, gaugeValue));

  // Calculate percentage based on target, but cap display at gaugeMax
  const percentOfTarget = gaugeTarget ? (gaugeValue / gaugeTarget) * 100 : 0;
  const gaugePercentage = ((normalizedValue - gaugeMin) / gaugeRange) * 100;
  const targetPercentage = gaugeTarget ? ((gaugeTarget - gaugeMin) / gaugeRange) * 100 : null;

  return (
    <div className={`card p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            {title}
          </h3>
        </div>

        {/* Main Value */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {currentValue}
            </div>
            <div className={`inline-flex items-center text-lg font-medium`}
              style={{color: isPositive ? '#22c55e' : '#b55c5c'}}
            >
              {isPositive ? (
                <ArrowUp className="h-5 w-5 mr-1" />
              ) : (
                <ArrowDown className="h-5 w-5 mr-1" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </div>
          </div>

          {/* Subtitle/Additional Info - only show first line, remove MTD text */}
          {subtitle && (
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              {subtitle.split('\n')[0]}
            </div>
          )}

          {/* Period comparison with trends */}
          {periodData && (
            <div className="space-y-2">
              {periodData.sevenDay && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{color: 'var(--text-muted)'}}>7D: {periodData.sevenDay.value}</span>
                  <div className={`inline-flex items-center text-xs`}
                    style={{color: periodData.sevenDay.trend > 0 ? '#22c55e' : '#b55c5c'}}
                  >
                    {periodData.sevenDay.trend > 0 ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(periodData.sevenDay.trend).toFixed(1)}%
                  </div>
                </div>
              )}
              {periodData.thirtyDay && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{color: 'var(--text-muted)'}}>30D: {periodData.thirtyDay.value}</span>
                  <div className={`inline-flex items-center text-xs`}
                    style={{color: periodData.thirtyDay.trend > 0 ? '#22c55e' : '#b55c5c'}}
                  >
                    {periodData.thirtyDay.trend > 0 ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(periodData.thirtyDay.trend).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gauge */}
        <div className="space-y-3">
          <div className="relative">
            {/* Background bar */}
            <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
              {/* Target line */}
              {targetPercentage !== null && (
                <div
                  className="absolute top-0 w-0.5 h-3 z-10"
                  style={{
                    left: `${targetPercentage}%`,
                    background: 'rgba(255, 255, 255, 0.6)'
                  }}
                />
              )}

              {/* Progress bar */}
              <div
                className="h-3 rounded-full transition-all duration-500 relative overflow-visible"
                style={{
                  width: `${gaugePercentage}%`,
                  background: `linear-gradient(90deg, var(--accent-primary), ${config.color})`
                }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
              </div>
            </div>

            {/* Value label positioned under the end of the progress bar */}
            {gaugeMin > 0 && gaugeValue !== null && (
              <div
                className="absolute top-4 text-xs font-medium"
                style={{
                  left: `${gaugePercentage}%`,
                  transform: 'translateX(-50%)',
                  color: 'var(--text-primary)'
                }}
              >
                {gaugeValue.toFixed(1)}%
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)', marginTop: gaugeMin > 0 ? '1.5rem' : '0.75rem'}}>
            <span>{gaugeLabel}</span>
            {gaugeMin === 0 && (
              <span>{percentOfTarget.toFixed(0)}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}