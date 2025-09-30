'use client';

import { format, parseISO } from 'date-fns';

interface FacebookMetricsChartProps {
  data: Array<{
    date: string;
    purchases: number;
    revenue: number;
  }>;
}

export default function FacebookMetricsChart({ data }: FacebookMetricsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>No data available</p>
      </div>
    );
  }

  const maxPurchases = Math.max(...data.map(d => d.purchases));
  const maxRevenue = Math.max(...data.map(d => d.revenue));

  // Calculate point positions
  const chartWidth = 100; // percentage
  const chartHeight = 256; // pixels
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  // Generate SVG path for revenue line
  const revenuePath = data.map((item, idx) => {
    const x = (idx / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((item.revenue / maxRevenue) * (chartHeight - 20));
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate SVG path for purchases line
  const purchasesPath = data.map((item, idx) => {
    const x = (idx / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((item.purchases / maxPurchases) * (chartHeight - 20));
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-6 justify-end">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)'}}></div>
          <span className="text-xs" style={{color: 'var(--text-muted)'}}>Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{background: 'linear-gradient(90deg, var(--accent-primary), #f59e0b)'}}></div>
          <span className="text-xs" style={{color: 'var(--text-muted)'}}>Purchases</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{height: `${chartHeight}px`}}>
        {/* Y-axis labels - Revenue */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs" style={{color: 'var(--text-muted)'}}>
          <span>${(maxRevenue / 1000).toFixed(1)}K</span>
          <span>${(maxRevenue * 0.75 / 1000).toFixed(1)}K</span>
          <span>${(maxRevenue * 0.5 / 1000).toFixed(1)}K</span>
          <span>${(maxRevenue * 0.25 / 1000).toFixed(1)}K</span>
          <span>$0</span>
        </div>

        {/* Y-axis labels - Purchases (right side) */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-xs" style={{color: 'var(--text-muted)'}}>
          <span>{maxPurchases.toFixed(0)}</span>
          <span>{(maxPurchases * 0.75).toFixed(0)}</span>
          <span>{(maxPurchases * 0.5).toFixed(0)}</span>
          <span>{(maxPurchases * 0.25).toFixed(0)}</span>
          <span>0</span>
        </div>

        {/* SVG Chart */}
        <div className="mx-12 h-full">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, idx) => (
              <line
                key={idx}
                x1="0"
                y1={chartHeight - (fraction * (chartHeight - 20))}
                x2={chartWidth}
                y2={chartHeight - (fraction * (chartHeight - 20))}
                stroke="var(--border-muted)"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}

            {/* Revenue line */}
            <path
              d={revenuePath}
              fill="none"
              stroke="url(#revenueGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Purchases line */}
            <path
              d={purchasesPath}
              fill="none"
              stroke="url(#purchasesGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points - Revenue */}
            {data.map((item, idx) => {
              const x = (idx / (data.length - 1 || 1)) * chartWidth;
              const y = chartHeight - ((item.revenue / maxRevenue) * (chartHeight - 20));
              return (
                <circle
                  key={`r-${idx}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="url(#revenueGradient)"
                  className="hover:r-5 transition-all"
                >
                  <title>{`${format(parseISO(item.date), 'MMM d')}: $${item.revenue.toFixed(2)}`}</title>
                </circle>
              );
            })}

            {/* Data points - Purchases */}
            {data.map((item, idx) => {
              const x = (idx / (data.length - 1 || 1)) * chartWidth;
              const y = chartHeight - ((item.purchases / maxPurchases) * (chartHeight - 20));
              return (
                <circle
                  key={`p-${idx}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="url(#purchasesGradient)"
                  className="hover:r-5 transition-all"
                >
                  <title>{`${format(parseISO(item.date), 'MMM d')}: ${item.purchases} purchases`}</title>
                </circle>
              );
            })}

            {/* Gradients */}
            <defs>
              <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-primary)" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <linearGradient id="purchasesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-primary)" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="mx-12 flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
        {data.length <= 7 ? (
          data.map((item, idx) => (
            <span key={idx}>{format(parseISO(item.date), 'MMM d')}</span>
          ))
        ) : (
          <>
            <span>{format(parseISO(data[0].date), 'MMM d')}</span>
            <span>{format(parseISO(data[Math.floor(data.length / 3)].date), 'MMM d')}</span>
            <span>{format(parseISO(data[Math.floor(2 * data.length / 3)].date), 'MMM d')}</span>
            <span>{format(parseISO(data[data.length - 1].date), 'MMM d')}</span>
          </>
        )}
      </div>
    </div>
  );
}
