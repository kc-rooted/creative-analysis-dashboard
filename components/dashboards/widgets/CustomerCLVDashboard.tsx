'use client';

interface CustomerCLVDashboardProps {
  data: {
    segments: Array<{
      tier: string;
      customerCount: number;
      avgCLV: number;
      highRiskCount: number;
      atRiskRevenue: number;
    }>;
    totalHighRisk: number;
    totalAtRiskRevenue: number;
  };
}

export default function CustomerCLVDashboard({ data }: CustomerCLVDashboardProps) {
  if (!data || !data.segments || data.segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>No customer data available</p>
      </div>
    );
  }

  const { segments, totalHighRisk, totalAtRiskRevenue } = data;

  // Calculate max values for scaling progress bars
  const maxCustomers = Math.max(...segments.map(s => s.customerCount));
  const maxCLV = Math.max(...segments.map(s => s.avgCLV));

  // Thresholds for gauges
  const highRiskThreshold = 5000;
  const revenueThreshold = 1500000; // $1.5M

  const highRiskPercent = (totalHighRisk / highRiskThreshold) * 100;
  const revenueRiskPercent = (totalAtRiskRevenue / revenueThreshold) * 100;

  // Get color for tier
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return '#8b5cf6'; // Purple
      case 'High Value': return '#89cdee'; // Light blue (accent-primary)
      case 'Medium Value': return '#10b981'; // Green
      case 'Low Value': return '#6b7280'; // Gray
      default: return '#6b7280';
    }
  };

  // Get gauge color based on percentage
  const getGaugeColor = (percent: number) => {
    if (percent >= 125) return '#b55c5c'; // Red
    if (percent >= 100) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  };

  return (
    <div className="space-y-6">
      {/* Customer Value Segments */}
      <div>
        <h4 className="text-sm font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
          Customer Value Segments
        </h4>
        <div className="space-y-4">
          {segments.map((segment, idx) => (
            <div key={idx} className="space-y-2">
              {/* Segment Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{backgroundColor: getTierColor(segment.tier)}}
                  />
                  <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                    {segment.tier}
                  </span>
                </div>
                <div className="flex gap-6 text-xs">
                  <span style={{color: 'var(--text-muted)'}}>
                    {segment.customerCount.toLocaleString()} customers
                  </span>
                  <span className="font-semibold" style={{color: 'var(--text-primary)'}}>
                    Avg CLV: ${segment.avgCLV.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="grid grid-cols-2 gap-4">
                {/* Customer Count Bar */}
                <div>
                  <div className="h-6 rounded-lg overflow-hidden" style={{backgroundColor: 'var(--border-muted)'}}>
                    <div
                      className="h-full flex items-center justify-end px-2 transition-all"
                      style={{
                        width: `${(segment.customerCount / maxCustomers) * 100}%`,
                        backgroundColor: getTierColor(segment.tier),
                        minWidth: '40px'
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {((segment.customerCount / maxCustomers) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* CLV Bar */}
                <div>
                  <div className="h-6 rounded-lg overflow-hidden" style={{backgroundColor: 'var(--border-muted)'}}>
                    <div
                      className="h-full flex items-center justify-end px-2 transition-all"
                      style={{
                        width: `${(segment.avgCLV / maxCLV) * 100}%`,
                        backgroundColor: getTierColor(segment.tier),
                        minWidth: '40px',
                        opacity: 0.7
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {((segment.avgCLV / maxCLV) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Churn Alert */}
      <div
        className="p-6 rounded-lg"
        style={{
          backgroundColor: '#b55c5c20',
          border: '2px solid #b55c5c'
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">🚨</span>
          <div>
            <h4 className="text-sm font-bold mb-1" style={{color: '#b55c5c'}}>
              CHURN ALERT
            </h4>
            <p className="text-sm" style={{color: 'var(--text-primary)'}}>
              <span className="font-bold">{totalHighRisk.toLocaleString()}</span> high-value customers
              showing 70%+ churn probability. Total at-risk revenue:
              <span className="font-bold"> ${(totalAtRiskRevenue / 1000000).toFixed(1)}M</span>.
            </p>
            <p className="text-xs mt-2" style={{color: 'var(--text-muted)'}}>
              Launch win-back campaign immediately.
            </p>
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* High-Risk Customers Gauge */}
          <div>
            <p className="text-xs mb-3" style={{color: 'var(--text-muted)'}}>
              High-Risk Customers vs Threshold (5,000)
            </p>
            <div className="relative">
              <div className="h-4 rounded-full overflow-hidden" style={{backgroundColor: 'var(--border-muted)'}}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(highRiskPercent, 100)}%`,
                    backgroundColor: getGaugeColor(highRiskPercent)
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-semibold" style={{color: getGaugeColor(highRiskPercent)}}>
                  {highRiskPercent.toFixed(0)}%
                </span>
                <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                  {totalHighRisk.toLocaleString()} / {highRiskThreshold.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Win-back Opportunity Gauge */}
          <div>
            <p className="text-xs mb-3" style={{color: 'var(--text-muted)'}}>
              Win-back Opportunity vs Target ($1.5M)
            </p>
            <div className="relative">
              <div className="h-4 rounded-full overflow-hidden" style={{backgroundColor: 'var(--border-muted)'}}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(revenueRiskPercent, 100)}%`,
                    backgroundColor: getGaugeColor(revenueRiskPercent)
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-semibold" style={{color: getGaugeColor(revenueRiskPercent)}}>
                  {revenueRiskPercent.toFixed(0)}%
                </span>
                <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                  ${(totalAtRiskRevenue / 1000000).toFixed(2)}M / $1.5M
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
