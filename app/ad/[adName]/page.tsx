'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency as baseFormatCurrency } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const adName = params.adName ? decodeURIComponent(params.adName as string) : '';
  const adsetName = searchParams.get('adset');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [timeWindow, setTimeWindow] = useState<number>(30);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // Currency-aware formatCurrency wrapper
  const formatCurrency = (value: number | null | undefined, decimals: number = 1): string => {
    return baseFormatCurrency(value, decimals, currencySymbol);
  };

  // Fetch currency symbol on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const clientResponse = await fetch('/api/admin/current-client');
        if (clientResponse.ok) {
          const data = await clientResponse.json();
          const configResponse = await fetch('/api/admin/clients');
          if (configResponse.ok) {
            const clients = await configResponse.json();
            const client = clients.find((c: any) => c.id === data.clientId);
            if (client?.dashboard?.currencySymbol) {
              setCurrencySymbol(client.dashboard.currencySymbol);
            }
          }
        }
      } catch (error) {
        console.error('[AD PAGE] Error fetching currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!adsetName) {
        setError('Missing adset parameter');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/ad/${encodeURIComponent(adName)}?adset=${encodeURIComponent(adsetName)}&days=${timeWindow}`);

        if (!response.ok) {
          throw new Error('Failed to fetch ad data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (adName && adsetName) {
      fetchData();
    }
  }, [adName, adsetName, timeWindow]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="card p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error</h3>
          <p style={{color: 'var(--text-muted)'}}>{error || 'Ad not found'}</p>
          <button
            onClick={() => router.push('/dashboards?section=facebook')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{background: 'var(--accent-primary)', color: 'white'}}
          >
            Back to Facebook Ads
          </button>
        </div>
      </div>
    );
  }

  const { analysis, timeseries } = data;

  // Health score color
  const getHealthColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#b55c5c';
  };

  // Trend color
  const getTrendColor = (trend: string) => {
    if (trend === 'IMPROVING' || trend === 'STABLE') return '#22c55e';
    if (trend === 'DECLINING') return '#b55c5c';
    return '#f59e0b';
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboards?section=facebook')}
          className="flex items-center gap-2 mb-4 text-sm hover:opacity-80"
          style={{color: 'var(--accent-primary)'}}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Facebook Ads
        </button>

        <div>
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>{adName}</h1>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                background: `${getHealthColor(analysis.healthScore)}20`,
                color: getHealthColor(analysis.healthScore)
              }}
            >
              Health: {analysis.healthScore}/100
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                background: `${getTrendColor(analysis.performanceTrend)}20`,
                color: getTrendColor(analysis.performanceTrend)
              }}
            >
              {analysis.performanceTrend.replace('_', ' ')}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{background: 'var(--bg-elevated)', color: 'var(--text-secondary)'}}>
              {analysis.statisticalConfidence.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{color: 'var(--text-muted)'}}>30D ROAS</h3>
          <div className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            {analysis.roas30d.toFixed(2)}x
          </div>
          <div className={`text-sm ${analysis.roasChangeVsPrev >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {analysis.roasChangeVsPrev >= 0 ? '↑' : '↓'} {Math.abs(analysis.roasChangeVsPrev).toFixed(1)}% vs prev
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{color: 'var(--text-muted)'}}>30D REVENUE</h3>
          <div className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            {formatCurrency(analysis.revenue30d)}
          </div>
          <div className={`text-sm ${analysis.revenueChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {analysis.revenueChangePct >= 0 ? '↑' : '↓'} {Math.abs(analysis.revenueChangePct).toFixed(1)}%
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{color: 'var(--text-muted)'}}>30D SPEND</h3>
          <div className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            {formatCurrency(analysis.spend30d)}
          </div>
          <div className={`text-sm ${analysis.spendChangePct >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {analysis.spendChangePct >= 0 ? '↑' : '↓'} {Math.abs(analysis.spendChangePct).toFixed(1)}%
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{color: 'var(--text-muted)'}}>HEALTH SCORE</h3>
          <div className="text-3xl font-bold mb-2" style={{color: getHealthColor(analysis.healthScore)}}>
            {analysis.healthScore}
          </div>
          <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
            {analysis.fatigueRisk.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Funnel Intelligence, Scaling Analysis, Benchmark Comparison Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Funnel Intelligence */}
        {analysis.currentFunnelStage && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Funnel Intelligence</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CURRENT STAGE</div>
                <span className="px-3 py-1 rounded text-sm font-medium" style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-secondary)'
                }}>
                  {analysis.currentFunnelStage}
                </span>
              </div>
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>AI RECOMMENDED</div>
                <span className="px-3 py-1 rounded text-sm font-medium" style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-secondary)'
                }}>
                  {analysis.inferredFunnelStage || 'N/A'}
                </span>
              </div>
              {analysis.isMisclassified && (
                <div className="px-3 py-2 rounded" style={{background: 'rgba(181, 92, 92, 0.1)', color: '#b55c5c'}}>
                  <span className="text-sm font-medium">⚠️ Misclassified</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{color: 'var(--text-secondary)'}}>TOFU</span>
                    <span className="text-sm font-bold" style={{color: 'var(--text-primary)'}}>
                      {(analysis.tofuScore || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{background: 'var(--bg-elevated)'}}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(Math.abs(analysis.tofuScore || 0) * 20, 100)}%`,
                        background: (analysis.tofuScore || 0) >= 0 ? '#22c55e' : '#b55c5c'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{color: 'var(--text-secondary)'}}>MOFU</span>
                    <span className="text-sm font-bold" style={{color: 'var(--text-primary)'}}>
                      {(analysis.mofuScore || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{background: 'var(--bg-elevated)'}}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(Math.abs(analysis.mofuScore || 0) * 20, 100)}%`,
                        background: (analysis.mofuScore || 0) >= 0 ? '#22c55e' : '#b55c5c'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{color: 'var(--text-secondary)'}}>BOFU</span>
                    <span className="text-sm font-bold" style={{color: 'var(--text-primary)'}}>
                      {(analysis.bofuScore || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{background: 'var(--bg-elevated)'}}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(Math.abs(analysis.bofuScore || 0) * 20, 100)}%`,
                        background: (analysis.bofuScore || 0) >= 0 ? '#22c55e' : '#b55c5c'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scaling Analysis */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Scaling Analysis</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>Low Spend ROAS</span>
                <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{analysis.lowSpendRoas.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>High Spend ROAS</span>
                <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{analysis.highSpendRoas.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>Scaling Efficiency</span>
                <span
                  className="font-semibold"
                  style={{color: analysis.scalingEfficiency >= 0 ? '#22c55e' : '#b55c5c'}}
                >
                  {analysis.scalingEfficiency >= 0 ? '+' : ''}{analysis.scalingEfficiency.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className="px-3 py-2 rounded-lg text-center font-medium"
              style={{
                background: analysis.scalingCategory === 'POSITIVE_SCALING' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(181, 92, 92, 0.1)',
                color: analysis.scalingCategory === 'POSITIVE_SCALING' ? '#22c55e' : '#b55c5c'
              }}
            >
              {analysis.scalingCategory.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Benchmark Comparison */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Benchmark Comparison</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>ROAS vs Account Avg</span>
                <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{analysis.roasVsAccountAvg.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>ROAS Index</span>
                <span
                  className="font-semibold"
                  style={{color: analysis.roasIndexVsAccount >= 100 ? '#22c55e' : '#f59e0b'}}
                >
                  {analysis.roasIndexVsAccount.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span style={{color: 'var(--text-muted)'}}>Efficiency Index</span>
                <span
                  className="font-semibold"
                  style={{color: analysis.efficiencyIndex >= 1 ? '#22c55e' : '#f59e0b'}}
                >
                  {analysis.efficiencyIndex.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Share of Spend</div>
                <div className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{analysis.shareOfSpend.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Share of Revenue</div>
                <div className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{analysis.shareOfRevenue.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
            Performance Trends
          </h3>
          {/* Time Window Selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeWindow(days)}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: timeWindow === days ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: timeWindow === days ? 'white' : 'var(--text-secondary)'
                }}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
        {timeseries && timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                label={{ value: 'ROAS', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                label={{ value: 'Spend', angle: 90, position: 'insideRight', fill: 'var(--text-muted)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return value.toFixed(2);
                  }
                  return value;
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dailyRoas"
                name="Daily ROAS"
                stroke="#89cdee"
                strokeWidth={1}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="roas7dAvg"
                name="7D Avg ROAS"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="roas30dAvg"
                name="30D Avg ROAS"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dailySpend"
                name="Daily Spend"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12" style={{color: 'var(--text-muted)'}}>
            No timeseries data available
          </div>
        )}
      </div>

      {/* Insights & Volatility Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* AI Insights & Recommendations */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>AI Insights & Recommendations</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>RECOMMENDED ACTION</div>
              <div
                className="px-4 py-3 rounded-lg font-medium"
                style={{
                  background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)',
                  color: 'white'
                }}
              >
                {analysis.recommendedAction.replace(/_/g, ' ')}
              </div>
            </div>
            {analysis.riskFlags && (
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>RISK FLAGS</div>
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(181, 92, 92, 0.1)',
                    color: '#b55c5c'
                  }}
                >
                  {analysis.riskFlags}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Volatility & Consistency */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Volatility & Consistency</h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>ROAS Volatility</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{analysis.roasVolatility.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>Best Day ROAS</div>
              <div className="text-2xl font-bold text-green-500">{analysis.bestDayRoas.toFixed(2)}x</div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>Worst Day ROAS</div>
              <div className="text-2xl font-bold text-red-500">{analysis.worstDayRoas.toFixed(2)}x</div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>Coef. of Variation</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{analysis.coefficientOfVariation.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Score Breakdown */}
      <div className="card p-6 mt-8 max-w-sm">
        <h3 className="text-sm font-semibold mb-3" style={{color: 'var(--text-primary)'}}>Health Score Breakdown</h3>
        <div className="space-y-2 text-xs" style={{color: 'var(--text-secondary)'}}>
          <div>
            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>ROAS (40pts):</span> vs account avg
          </div>
          <div>
            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>Stability (20pts):</span> coefficient of variation
          </div>
          <div>
            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>Trend (20pts):</span> 4-week performance
          </div>
          <div>
            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>Efficiency (20pts):</span> absolute ROAS
          </div>
        </div>
      </div>
    </div>
  );
}
