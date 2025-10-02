'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignName = decodeURIComponent(params.campaignName as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [timeWindow, setTimeWindow] = useState<number>(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/campaign/${encodeURIComponent(campaignName)}?days=${timeWindow}`);

        if (!response.ok) {
          throw new Error('Failed to fetch campaign data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignName, timeWindow]);

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
          <p style={{color: 'var(--text-muted)'}}>{error || 'Campaign not found'}</p>
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

  const { analysis, timeseries, contextualData } = data;

  // Health score color
  const getHealthColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Trend color
  const getTrendColor = (trend: string) => {
    if (trend === 'IMPROVING' || trend === 'STABLE') return '#22c55e';
    if (trend === 'DECLINING') return '#ef4444';
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
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>{campaignName}</h1>
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

      {/* Business Context Cards */}
      {contextualData && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Business Context */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Business Context</h3>
            <div className="space-y-4">
              {/* Business Health Index */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>BUSINESS HEALTH INDEX</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {contextualData.businessHealthIndex}
                  </div>
                  <div className="text-sm" style={{color: 'var(--text-muted)'}}>/100</div>
                </div>
                {/* Health Bar */}
                <div className="relative h-2 rounded-full mb-3" style={{background: 'var(--border-muted)'}}>
                  <div
                    className="absolute top-0 left-0 h-2 rounded-full"
                    style={{
                      width: `${contextualData.businessHealthIndex}%`,
                      background: contextualData.businessHealthIndex >= 70 ? '#22c55e' : contextualData.businessHealthIndex >= 40 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              {/* Business Trends */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>BUSINESS TRENDS</div>
                <div className="flex flex-col gap-2">
                  <span
                    className="px-3 py-1.5 rounded text-xs font-medium text-center"
                    style={{
                      background: contextualData.businessRevenueTrend === 'REVENUE_GROWING' ? 'rgba(34, 197, 94, 0.1)' : contextualData.businessRevenueTrend === 'REVENUE_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: contextualData.businessRevenueTrend === 'REVENUE_GROWING' ? '#22c55e' : contextualData.businessRevenueTrend === 'REVENUE_DECLINING' ? '#ef4444' : '#f59e0b'
                    }}
                  >
                    {contextualData.businessRevenueTrend.replace('REVENUE_', '')} Revenue
                  </span>
                  <span
                    className="px-3 py-1.5 rounded text-xs font-medium text-center"
                    style={{
                      background: contextualData.businessDemandTrend === 'DEMAND_GROWING' ? 'rgba(34, 197, 94, 0.1)' : contextualData.businessDemandTrend === 'DEMAND_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: contextualData.businessDemandTrend === 'DEMAND_GROWING' ? '#22c55e' : contextualData.businessDemandTrend === 'DEMAND_DECLINING' ? '#ef4444' : '#f59e0b'
                    }}
                  >
                    {contextualData.businessDemandTrend.replace('DEMAND_', '')} Demand
                  </span>
                  <span
                    className="px-3 py-1.5 rounded text-xs font-medium text-center"
                    style={{
                      background: contextualData.businessYoyStatus === 'OUTPERFORMING_YOY' ? 'rgba(34, 197, 94, 0.1)' : contextualData.businessYoyStatus === 'UNDERPERFORMING_YOY' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: contextualData.businessYoyStatus === 'OUTPERFORMING_YOY' ? '#22c55e' : contextualData.businessYoyStatus === 'UNDERPERFORMING_YOY' ? '#ef4444' : '#f59e0b'
                    }}
                  >
                    {contextualData.businessYoyStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Campaign Contribution */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CAMPAIGN CONTRIBUTION</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Share of Revenue</div>
                    <div className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{contextualData.campaignShareOfRevenue.toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Share of Orders</div>
                    <div className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{contextualData.campaignShareOfOrders.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contextualized Insights */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Contextualized Insights</h3>
            <div className="space-y-4">
              {/* Relative Performance */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>RELATIVE PERFORMANCE</div>
                <div
                  className="px-3 py-2 rounded-lg text-center font-medium"
                  style={{
                    background: contextualData.relativePerformance === 'OUTPERFORMING_MARKET' ? 'rgba(34, 197, 94, 0.1)' : contextualData.relativePerformance === 'UNDERPERFORMING_MARKET' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(137, 205, 238, 0.1)',
                    color: contextualData.relativePerformance === 'OUTPERFORMING_MARKET' ? '#22c55e' : contextualData.relativePerformance === 'UNDERPERFORMING_MARKET' ? '#ef4444' : 'var(--accent-primary)'
                  }}
                >
                  {contextualData.relativePerformance.replace(/_/g, ' ')}
                </div>
              </div>

              {/* AI Recommendation */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>AI RECOMMENDATION</div>
                <div
                  className="px-4 py-3 rounded-lg font-medium text-sm"
                  style={{
                    background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)',
                    color: 'white'
                  }}
                >
                  {contextualData.contextualizedRecommendation}
                </div>
              </div>

              {/* Context Flags */}
              {contextualData.contextFlags && (
                <div>
                  <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CONTEXT FLAGS</div>
                  <div className="flex flex-wrap gap-2">
                    {contextualData.contextFlags.split(' ').map((flag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: flag.includes('⚠️') ? 'rgba(239, 68, 68, 0.1)' : flag.includes('📉') ? 'rgba(239, 68, 68, 0.1)' : flag.includes('⚡') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(137, 205, 238, 0.1)',
                          color: flag.includes('⚠️') ? '#ef4444' : flag.includes('📉') ? '#ef4444' : flag.includes('⚡') ? '#f59e0b' : 'var(--accent-primary)'
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
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
                  style={{color: analysis.scalingEfficiency >= 0 ? '#22c55e' : '#ef4444'}}
                >
                  {analysis.scalingEfficiency >= 0 ? '+' : ''}{analysis.scalingEfficiency.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className="px-3 py-2 rounded-lg text-center font-medium"
              style={{
                background: analysis.scalingCategory === 'POSITIVE_SCALING' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: analysis.scalingCategory === 'POSITIVE_SCALING' ? '#22c55e' : '#ef4444'
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
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444'
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

      {/* Performance Chart */}
      <div className="card p-6">
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
      </div>
    </div>
  );
}
