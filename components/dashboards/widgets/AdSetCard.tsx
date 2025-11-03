'use client';

import { ArrowUp, ArrowDown, TrendingUp, MoreVertical } from 'lucide-react';
import { CombinedAdSetData } from '@/lib/mock-data/meta-ads-optimization';

interface AdSetCardProps {
  data: CombinedAdSetData;
  onViewCreative?: () => void;
  onViewHistory?: () => void;
  onPromoteDemote?: () => void;
}

const roleConfig = {
  Champion: {
    badge: '🏆',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
    label: 'Champion'
  },
  Backup: {
    badge: '🥈',
    color: '#C0C0C0',
    bgColor: 'rgba(192, 192, 192, 0.1)',
    label: 'Backup'
  },
  Testing: {
    badge: '🧪',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    label: 'Testing'
  }
};

export default function AdSetCard({
  data,
  onViewCreative,
  onViewHistory,
  onPromoteDemote
}: AdSetCardProps) {
  const config = roleConfig[data.role_label];
  const isStable = data.roas_volatility < 0.6;
  const isFrequencyHealthy = data.avg_frequency_7d < 3.5;

  // Determine status colors for Bayesian probabilities
  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.9) return '#22c55e'; // Green
    if (prob >= 0.8) return '#f59e0b'; // Yellow
    return '#b55c5c'; // Red
  };

  const probBestColor = getProbabilityColor(data.bayesian.probability_best);
  const probThresholdColor = getProbabilityColor(data.bayesian.probability_above_threshold);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {data.adset_name}
          </h3>
        </div>
        <div
          className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: config.bgColor,
            color: config.color
          }}
        >
          <span>{config.badge}</span>
          <span>{config.label}</span>
        </div>
      </div>

      {/* Three-Column Performance + Bayesian Layout */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Left: Today's Performance Card */}
        <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              CURRENT PERFORMANCE (Today)
            </h4>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* ROAS */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ROAS</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.roas.toFixed(2)}x
              </div>
              <div className={`inline-flex items-center text-xs font-medium`}
                style={{ color: data.roas_delta > 0 ? '#22c55e' : '#b55c5c' }}
              >
                {data.roas_delta > 0 ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(data.roas_delta).toFixed(1)}x
              </div>
            </div>

            {/* Spend */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Spend</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                ${data.spend.toFixed(0)}
              </div>
              <div className="h-1.5 rounded-full mt-2" style={{ background: 'var(--border-muted)' }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (data.spend / data.daily_budget) * 100)}%`,
                    background: 'var(--accent-primary)'
                  }}
                />
              </div>
            </div>

            {/* Purchases */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Purchases</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.purchases}
              </div>
            </div>
          </div>

          {/* Secondary Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {/* CVR */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CVR</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {data.cvr.toFixed(2)}%
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Frequency</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {data.frequency.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: isFrequencyHealthy ? '#22c55e' : '#f59e0b' }}>
                {isFrequencyHealthy ? '✓ Healthy' : '⚠ Monitor'}
              </div>
            </div>

            {/* CPC */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CPC</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                ${data.cpc.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Middle: 14-Day Window Card */}
        <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              14-DAY WINDOW
            </h4>
          </div>

          {/* 14-Day Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* ROAS */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ROAS</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.roas_14d.toFixed(2)}x
              </div>
            </div>

            {/* Purchases */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Purchases</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.purchases_14d}
              </div>
            </div>

            {/* CVR */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CVR</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {data.cvr_14d.toFixed(2)}%
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Frequency</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {data.avg_frequency_7d.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-1">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Days: {data.days_in_window_14d}
            </div>
            <div className="text-xs" style={{ color: isStable ? '#22c55e' : '#f59e0b' }}>
              {isStable ? '✓ Stable' : '⚠ Volatile'}
            </div>
          </div>
        </div>

        {/* Right: Bayesian Analysis Card */}
        <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              BAYESIAN ANALYSIS
            </h4>
          </div>

          {/* P(Best Ad) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                P(Best Ad in Campaign)
              </div>
              <div className="text-xs" style={{ color: data.bayesian.prob_best_delta > 0 ? '#22c55e' : '#b55c5c' }}>
                {data.bayesian.prob_best_delta > 0 ? '↑' : '↓'} {Math.abs(data.bayesian.prob_best_delta * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: probBestColor }}>
              {(data.bayesian.probability_best * 100).toFixed(1)}%
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-muted)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${data.bayesian.probability_best * 100}%`,
                  background: probBestColor
                }}
              />
            </div>
          </div>

          {/* P(ROAS > Threshold) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                P(ROAS &gt; {data.bayesian.threshold_value.toFixed(1)}x)
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: probThresholdColor }}>
              {(data.bayesian.probability_above_threshold * 100).toFixed(1)}%
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-muted)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${data.bayesian.probability_above_threshold * 100}%`,
                  background: probThresholdColor
                }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--border-muted)' }}>
            <div
              className="text-xs font-medium flex items-start gap-2"
              style={{ color: data.bayesian.criteria_met ? '#22c55e' : '#f59e0b' }}
            >
              <span>{data.bayesian.criteria_met ? '✓' : '⚠'}</span>
              <span>{data.bayesian.criteria_message}</span>
            </div>
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Loss: ${data.bayesian.expected_loss_daily.toFixed(2)}/day
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Strip */}
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Budget</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              ${data.daily_budget}/day ({((data.spend / data.daily_budget) * 100).toFixed(0)}%)
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Audience</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {data.audience_code}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Days in Role</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {data.days_in_current_role}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Funnel</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {data.funnel_stage}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
