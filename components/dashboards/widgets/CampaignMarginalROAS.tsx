'use client';

interface CampaignType {
  type: string;
  avgSpend: number;
  avgRoas: number;
  marginalRoas: number;
  action: string;
  spendChange: number;
  projectedImpact: number;
}

interface CampaignMarginalROASProps {
  data: CampaignType[];
}

export default function CampaignMarginalROAS({ data }: CampaignMarginalROASProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>No campaign data available</p>
      </div>
    );
  }

  const getActionIcon = (marginalRoas: number) => {
    if (marginalRoas > 5) return '↗';
    if (marginalRoas < 0) return '↘';
    return '→';
  };

  const getActionText = (marginalRoas: number) => {
    if (marginalRoas > 5) return 'Scale';
    if (marginalRoas < 0) return 'Cut';
    return 'Monitor';
  };

  const getActionColor = (marginalRoas: number) => {
    if (marginalRoas > 5) return '#22c55e'; // Green
    if (marginalRoas < 0) return '#ef4444'; // Red
    return '#f59e0b'; // Orange
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('REDUCE')) return '#ef4444';
    if (action.includes('OPTIMIZE')) return '#f59e0b';
    return '#22c55e';
  };

  // Calculate recommendation based on the data
  const topCampaign = [...data].sort((a, b) => b.marginalRoas - a.marginalRoas)[0];
  const totalProjectedImpact = data.reduce((sum, d) => sum + Math.abs(d.projectedImpact), 0);

  return (
    <div className="space-y-6">
      {/* Campaign Type Table */}
      <div>
        <h4 className="text-sm font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
          MARGINAL ROAS OPPORTUNITY FINDER
        </h4>
        <p className="text-xs mb-4" style={{color: 'var(--text-muted)'}}>
          Next Dollar Efficiency Analysis
        </p>

        <div className="space-y-3">
          {data.map((campaign, idx) => {
            const action = getActionText(campaign.marginalRoas);
            const actionColor = getActionColor(campaign.marginalRoas);

            return (
              <div
                key={idx}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: `2px solid ${actionColor}40`
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="text-sm font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                      {campaign.type}
                    </h5>
                    <div className="flex gap-2 items-center">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: getActionBadgeColor(campaign.action),
                          color: 'white'
                        }}
                      >
                        {campaign.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                        ${campaign.avgSpend.toFixed(0)}/day avg
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{color: actionColor}}>
                        {campaign.marginalRoas.toFixed(1)}x
                      </span>
                      <span className="text-2xl" style={{color: actionColor}}>
                        {getActionIcon(campaign.marginalRoas)}
                      </span>
                    </div>
                    <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                      Marginal ROAS
                    </span>
                  </div>
                </div>

                {/* Action Recommendation */}
                <div className="flex justify-between items-center pt-3" style={{borderTop: '1px solid var(--border-muted)'}}>
                  <div>
                    <span className="text-xs block" style={{color: 'var(--text-muted)'}}>
                      Avg ROAS: {campaign.avgRoas.toFixed(2)}x
                    </span>
                    <span className="text-xs block mt-1" style={{color: 'var(--text-muted)'}}>
                      Change: {campaign.spendChange > 0 ? '+' : ''}{campaign.spendChange.toFixed(0)}/day
                    </span>
                  </div>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-bold"
                    style={{
                      backgroundColor: actionColor + '20',
                      color: actionColor
                    }}
                  >
                    {action} {getActionIcon(campaign.marginalRoas)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation */}
      <div>
        <h4 className="text-sm font-bold mb-2" style={{color: '#22c55e'}}>
          AI RECOMMENDATION
        </h4>
        <p className="text-sm mb-2" style={{color: 'var(--text-primary)'}}>
          {topCampaign.type} shows strongest marginal efficiency at {topCampaign.marginalRoas.toFixed(2)}x.
          Reallocate budget based on marginal ROAS signals.
        </p>
        <p className="text-xs" style={{color: 'var(--text-muted)'}}>
          Total optimization potential: <span className="font-bold">${(totalProjectedImpact / 1000).toFixed(1)}K/month</span>.
        </p>
      </div>
    </div>
  );
}
