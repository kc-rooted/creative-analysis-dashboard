'use client';

interface PlatformMetric {
  platform: string;
  roas7d: number;
  roasPeriod: number;
  trendPct: number;
  action: string;
  totalSpend: number;
  totalRevenue: number;
}

interface PlatformPerformanceMatrixProps {
  data: PlatformMetric[];
  roasTarget?: number;
  period?: string;
}

export default function PlatformPerformanceMatrix({ data, roasTarget = 5, period = '30d' }: PlatformPerformanceMatrixProps) {
  const periodLabel = period.toUpperCase();
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>No platform data available</p>
      </div>
    );
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return '↗';
    if (trend < -5) return '↘';
    return '→';
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return '#22c55e'; // Green
    if (trend < -5) return '#ef4444'; // Red
    return 'var(--text-muted)';
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'scale': return '#22c55e'; // Green
      case 'optimize': return '#f59e0b'; // Orange
      case 'monitor': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  const getGaugePercent = (roas: number) => {
    return (roas / roasTarget) * 100;
  };

  const getGaugeColor = (percent: number) => {
    if (percent >= 120) return '#22c55e'; // Green
    if (percent >= 80) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="space-y-6">
      {/* Channel Performance Table */}
      <div>
        <h4 className="text-sm font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          CHANNEL PERFORMANCE MATRIX
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                <th className="text-left py-3 px-4 text-xs font-semibold" style={{color: 'var(--text-muted)'}}>Channel</th>
                <th className="text-right py-3 px-4 text-xs font-semibold" style={{color: 'var(--text-muted)'}}>7D ROAS</th>
                <th className="text-right py-3 px-4 text-xs font-semibold" style={{color: 'var(--text-muted)'}}>{periodLabel} ROAS</th>
                <th className="text-center py-3 px-4 text-xs font-semibold" style={{color: 'var(--text-muted)'}}>Trend</th>
                <th className="text-center py-3 px-4 text-xs font-semibold" style={{color: 'var(--text-muted)'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((platform, idx) => (
                <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <td className="py-3 px-4 text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                    {platform.platform}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold" style={{color: 'var(--text-primary)'}}>
                    {platform.roas7d.toFixed(2)}x
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold" style={{color: 'var(--text-primary)'}}>
                    {platform.roasPeriod.toFixed(2)}x
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-lg font-bold" style={{color: getTrendColor(platform.trendPct)}}>
                      {getTrendIcon(platform.trendPct)} {Math.abs(platform.trendPct).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: getActionColor(platform.action) + '20',
                        color: getActionColor(platform.action)
                      }}
                    >
                      {platform.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROAS Gauges */}
      <div>
        <h4 className="text-sm font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          ROAS vs Target ({roasTarget}x)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((platform, idx) => {
            const percent = getGaugePercent(platform.roasPeriod);
            const color = getGaugeColor(percent);

            return (
              <div key={idx} className="p-4 rounded-lg" style={{backgroundColor: 'var(--bg-elevated)'}}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                    {platform.platform}
                  </span>
                  <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                    Period ROAS
                  </span>
                </div>

                {/* Gauge Bar */}
                <div className="relative h-8 rounded-full overflow-hidden mb-2" style={{backgroundColor: 'var(--border-muted)'}}>
                  <div
                    className="h-full transition-all flex items-center justify-end px-3 relative"
                    style={{
                      width: `${Math.min(percent, 100)}%`,
                      background: `linear-gradient(90deg, var(--accent-primary), ${color})`
                    }}
                  >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
                    <span className="text-sm font-bold text-white relative z-10">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center text-xs">
                  <span style={{color: 'var(--text-muted)'}}>
                    ${(platform.totalSpend / 1000).toFixed(1)}K spend
                  </span>
                  <span className="font-bold" style={{color: color}}>
                    {platform.roasPeriod.toFixed(2)}x / {roasTarget}x
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insight Box */}
      <div>
        <h4 className="text-sm font-bold mb-2" style={{color: '#22c55e'}}>
          AI INSIGHT
        </h4>
        <p className="text-sm" style={{color: 'var(--text-primary)'}}>
          {data[0]?.platform} showing stronger period ROAS ({data[0]?.roasPeriod.toFixed(2)}x vs {data[1]?.platform} {data[1]?.roasPeriod.toFixed(2)}x).
          {data[0]?.trendPct > 0 ? ' Positive momentum detected.' : ' Monitor performance closely.'}
        </p>
      </div>
    </div>
  );
}
