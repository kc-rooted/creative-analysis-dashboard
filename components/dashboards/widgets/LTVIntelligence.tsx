'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

interface LTVIntelligenceProps {
  data: {
    ltvByTier: Array<{
      value_tier: string;
      customer_count: number;
      avg_ltv: number;
      min_ltv: number;
      max_ltv: number;
      total_ltv: number;
    }>;
    ltvByCountry: Array<{
      country: string;
      customer_count: number;
      avg_ltv: number;
      total_revenue: number;
    }>;
    predictedVsActual: Array<{
      value_tier: string;
      customer_count: number;
      avg_predicted_clv: number;
      avg_actual_ltv: number;
    }>;
  };
}

export default function LTVIntelligence({ data }: LTVIntelligenceProps) {
  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="space-y-8">
      {/* LTV by Tier - Chart and Table in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LTV Progress Bars */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
            Lifetime Value by Customer Tier
          </h3>
          <div className="space-y-6">
            {data.ltvByTier.map((tier, idx) => {
              const maxTotal = Math.max(...data.ltvByTier.map(t => typeof t.total_ltv === 'string' ? parseFloat(t.total_ltv) : t.total_ltv));
              const maxAvg = Math.max(...data.ltvByTier.map(t => typeof t.avg_ltv === 'string' ? parseFloat(t.avg_ltv) : t.avg_ltv));
              const totalLtv = typeof tier.total_ltv === 'string' ? parseFloat(tier.total_ltv) : tier.total_ltv;
              const avgLtv = typeof tier.avg_ltv === 'string' ? parseFloat(tier.avg_ltv) : tier.avg_ltv;
              const totalPercent = (totalLtv / maxTotal) * 100;
              const avgPercent = (avgLtv / maxAvg) * 100;

              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                      {tier.value_tier}
                    </span>
                    <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                      {tier.customer_count.toLocaleString()} customers
                    </span>
                  </div>

                  {/* Total LTV Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{color: 'var(--text-muted)'}}>Total LTV</span>
                      <span className="font-semibold" style={{color: '#22c55e'}}>
                        {formatCurrency(totalLtv)}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-2 rounded-full" style={{background: 'var(--border-muted)'}}>
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${totalPercent}%`,
                            background: 'linear-gradient(90deg, #22c55e, #16a34a)'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Avg LTV Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{color: 'var(--text-muted)'}}>Avg LTV</span>
                      <span className="font-semibold" style={{color: '#89cdee'}}>
                        {formatCurrency(avgLtv)}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-2 rounded-full" style={{background: 'var(--border-muted)'}}>
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${avgPercent}%`,
                            background: 'linear-gradient(90deg, #89cdee, #60a5fa)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LTV Distribution Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
            LTV Distribution by Tier
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Tier</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Customers</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Avg LTV</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Min LTV</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Max LTV</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.ltvByTier.map((tier, idx) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>{tier.value_tier}</td>
                    <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>{tier.customer_count.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-semibold" style={{color: '#89cdee'}}>{formatCurrency(tier.avg_ltv)}</td>
                    <td className="py-3 px-2 text-right" style={{color: 'var(--text-muted)'}}>{formatCurrency(tier.min_ltv)}</td>
                    <td className="py-3 px-2 text-right" style={{color: 'var(--text-muted)'}}>{formatCurrency(tier.max_ltv)}</td>
                    <td className="py-3 px-2 text-right font-semibold" style={{color: '#22c55e'}}>{formatCurrency(tier.total_ltv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Geographic LTV */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          Top 15 Countries by LTV
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Country</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Customers</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Avg LTV</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.ltvByCountry.map((country, idx) => (
                <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>{country.country}</td>
                  <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>{country.customer_count.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right font-semibold" style={{color: '#89cdee'}}>{formatCurrency(country.avg_ltv)}</td>
                  <td className="py-3 px-2 text-right font-semibold" style={{color: '#22c55e'}}>{formatCurrency(country.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
