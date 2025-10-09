'use client';

interface CustomerJourneyAnalysisProps {
  data: Array<{
    journeyPattern: string;
    customerCount: number;
    avgTouchpoints: number;
    avgDaysToPurchase: number;
    conversionRate: number;
    totalRevenue: number;
    avgOrderValue: number;
    firstTouchChannel: string;
    lastTouchChannel: string;
  }>;
}

export default function CustomerJourneyAnalysis({ data }: CustomerJourneyAnalysisProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          Customer Journey Analysis
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>No journey data available</p>
            <p className="text-xs" style={{color: 'var(--text-muted)'}}>
              Journey tracking may need to be configured or data is still being processed
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate summary stats
  const totalCustomers = data.reduce((sum, j) => sum + j.customerCount, 0);
  const avgTouchpoints = data.reduce((sum, j) => sum + (j.avgTouchpoints * j.customerCount), 0) / totalCustomers;
  const avgDays = data.reduce((sum, j) => sum + (j.avgDaysToPurchase * j.customerCount), 0) / totalCustomers;
  const totalRevenue = data.reduce((sum, j) => sum + j.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-4">
          <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Total Journeys Tracked</div>
          <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
            {totalCustomers.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Avg Touchpoints</div>
          <div className="text-2xl font-bold" style={{color: '#89cdee'}}>
            {avgTouchpoints.toFixed(1)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Avg Days to Purchase</div>
          <div className="text-2xl font-bold" style={{color: '#f59e0b'}}>
            {avgDays.toFixed(1)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Total Revenue</div>
          <div className="text-2xl font-bold" style={{color: '#22c55e'}}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Journey Patterns Table */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          Top Customer Journey Patterns
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Journey Pattern</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Customers</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Touchpoints</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Avg Days</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Conv Rate</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>AOV</th>
                <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>First → Last</th>
              </tr>
            </thead>
            <tbody>
              {data.map((journey, idx) => (
                <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>
                    {journey.journeyPattern}
                  </td>
                  <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                    {journey.customerCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right" style={{color: '#89cdee'}}>
                    {journey.avgTouchpoints.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-right" style={{color: '#f59e0b'}}>
                    {journey.avgDaysToPurchase.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                    {journey.conversionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-2 text-right font-semibold" style={{color: '#22c55e'}}>
                    {formatCurrency(journey.totalRevenue)}
                  </td>
                  <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                    {formatCurrency(journey.avgOrderValue)}
                  </td>
                  <td className="py-3 px-2 text-xs" style={{color: 'var(--text-muted)'}}>
                    {journey.firstTouchChannel} → {journey.lastTouchChannel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journey Efficiency Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          Journey Efficiency Analysis
        </h3>
        <div className="space-y-4">
          {data.slice(0, 5).map((journey, idx) => {
            const efficiency = journey.totalRevenue / journey.avgTouchpoints;
            return (
              <div key={idx} className="p-4 rounded-lg" style={{backgroundColor: 'rgba(137, 205, 238, 0.05)'}}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                      {journey.journeyPattern}
                    </span>
                    <span className="text-xs ml-2" style={{color: 'var(--text-muted)'}}>
                      {journey.customerCount.toLocaleString()} customers
                    </span>
                  </div>
                  <div className="text-sm font-bold" style={{color: '#22c55e'}}>
                    {formatCurrency(efficiency)}/touchpoint
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span style={{color: 'var(--text-muted)'}}>Touchpoints: </span>
                    <span className="font-semibold" style={{color: '#89cdee'}}>
                      {journey.avgTouchpoints.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span style={{color: 'var(--text-muted)'}}>Days: </span>
                    <span className="font-semibold" style={{color: '#f59e0b'}}>
                      {journey.avgDaysToPurchase.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span style={{color: 'var(--text-muted)'}}>Revenue: </span>
                    <span className="font-semibold" style={{color: '#22c55e'}}>
                      {formatCurrency(journey.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
