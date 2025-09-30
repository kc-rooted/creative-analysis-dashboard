'use client';

interface GripSwitchingSankeyProps {
  data: Array<{
    firstGrip: string;
    repeatGrip: string;
    behaviorType: string;
    orders: number;
    customers: number;
    revenue: number;
    avgOrderValue: number;
    avgDaysBetween: number;
    pctOfRepeats: number;
    pctOfRevenue: number;
  }>;
}

export default function GripSwitchingSankey({ data }: GripSwitchingSankeyProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>No switching data available</p>
      </div>
    );
  }

  // Group data by behavior type
  const loyalData = data.filter(d => d.behaviorType === 'Loyal');
  const switcherData = data.filter(d => d.behaviorType === 'Switcher');

  return (
    <div className="space-y-6">
      {/* Customer Journey Flows */}
      <div className="space-y-4 mt-4">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-lg"
            style={{
              backgroundColor: item.behaviorType === 'Loyal' ? '#10b98120' : '#f59e0b20',
              border: `2px solid ${item.behaviorType === 'Loyal' ? '#10b981' : '#f59e0b'}`
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                    {item.firstGrip} → {item.repeatGrip}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: item.behaviorType === 'Loyal' ? '#10b981' : '#f59e0b',
                      color: 'white'
                    }}
                  >
                    {item.behaviorType}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <p style={{color: 'var(--text-muted)'}}>Customers</p>
                    <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                      {item.customers.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{color: 'var(--text-muted)'}}>Orders</p>
                    <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                      {item.orders.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{color: 'var(--text-muted)'}}>Revenue</p>
                    <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                      ${(item.revenue / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p style={{color: 'var(--text-muted)'}}>% of Repeats</p>
                    <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                      {item.pctOfRepeats.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual percentage bar */}
              <div className="w-32">
                <div className="h-8 rounded-lg overflow-hidden" style={{backgroundColor: 'var(--border-muted)'}}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${item.pctOfRepeats}%`,
                      backgroundColor: item.behaviorType === 'Loyal' ? '#10b981' : '#f59e0b'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats - 1/2 each */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 rounded-lg" style={{backgroundColor: '#10b98120', border: '2px solid #10b981'}}>
          <p className="text-xs mb-2" style={{color: 'var(--text-muted)'}}>Loyal Customers</p>
          <p className="text-2xl font-bold mb-1" style={{color: '#10b981'}}>
            {loyalData.reduce((sum, d) => sum + d.customers, 0).toLocaleString()}
          </p>
          <p className="text-sm font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
            ${(loyalData.reduce((sum, d) => sum + d.revenue, 0) / 1000).toFixed(0)}K revenue
          </p>
          <p className="text-xs" style={{color: 'var(--text-muted)'}}>
            Same grip on repeat purchase
          </p>
        </div>

        <div className="p-4 rounded-lg" style={{backgroundColor: '#f59e0b20', border: '2px solid #f59e0b'}}>
          <p className="text-xs mb-2" style={{color: 'var(--text-muted)'}}>Switching Customers</p>
          <p className="text-2xl font-bold mb-1" style={{color: '#f59e0b'}}>
            {switcherData.reduce((sum, d) => sum + d.customers, 0).toLocaleString()}
          </p>
          <p className="text-sm font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
            ${(switcherData.reduce((sum, d) => sum + d.revenue, 0) / 1000).toFixed(0)}K revenue
          </p>
          <p className="text-xs" style={{color: 'var(--text-muted)'}}>
            Different grip on repeat purchase
          </p>
        </div>
      </div>
    </div>
  );
}
