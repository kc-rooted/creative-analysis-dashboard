'use client';

interface CustomerOverviewKPIsProps {
  data: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    avgLTV: number;
    avgAOV: number;
    totalRevenue: number;
    active30d: number;
    active90d: number;
    avgChurnProbability: number;
    highRiskCustomers: number;
    newVsReturningRatio: number;
  };
}

export default function CustomerOverviewKPIs({ data }: CustomerOverviewKPIsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const newCustomerPercent = (data.newCustomers / data.totalCustomers) * 100;
  const returningCustomerPercent = (data.returningCustomers / data.totalCustomers) * 100;
  const activePercent30d = (data.active30d / data.totalCustomers) * 100;
  const churnRiskPercent = (data.highRiskCustomers / data.totalCustomers) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Customers */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            TOTAL CUSTOMERS
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatNumber(data.totalCustomers)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              {formatNumber(data.active30d)} active (30d) • {formatNumber(data.active90d)} active (90d)
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(activePercent30d, 100)}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
              <span>30-day active rate</span>
              <span>{activePercent30d.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Customers */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            NEW CUSTOMERS
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatNumber(data.newCustomers)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              First-time purchasers
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(newCustomerPercent, 100)}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary), #89cdee)'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
              <span>% of total customers</span>
              <span>{newCustomerPercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Returning Customers */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            RETURNING CUSTOMERS
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatNumber(data.returningCustomers)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              2+ orders placed
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(returningCustomerPercent, 100)}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
              <span>% of total customers</span>
              <span>{returningCustomerPercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Average LTV */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            AVERAGE LIFETIME VALUE
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatCurrency(data.avgLTV)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Avg Order Value: {formatCurrency(data.avgAOV)}
            </div>
          </div>
        </div>
      </div>

      {/* Total Customer Revenue */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            TOTAL CUSTOMER REVENUE
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatCurrency(data.totalRevenue)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Lifetime value of all customers
            </div>
          </div>
        </div>
      </div>

      {/* Churn Risk */}
      <div className="card p-6">
        <div className="space-y-6">
          <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
            HIGH RISK CUSTOMERS
          </h3>
          <div className="space-y-3">
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              {formatNumber(data.highRiskCustomers)}
            </div>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Avg churn probability: {(data.avgChurnProbability * 100).toFixed(1)}%
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(churnRiskPercent, 100)}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #b55c5c)'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
              <span>% at high risk</span>
              <span>{churnRiskPercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
