'use client';

interface ProductRankingsProps {
  data: Array<{
    productTitle: string;
    variantTitle: string;
    revenue: number;
    revenueGrowth: number;
    revenueRank: number;
    performanceTier: string;
    trendStatus: string;
  }>;
}

export default function ProductRankings({ data }: ProductRankingsProps) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
      <div className="space-y-3">
        {data.slice(0, 10).map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary-30)',
              border: '1px solid var(--border-muted)'
            }}
          >
            {/* Rank and Product */}
            <div className="flex items-start gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-full font-bold text-xs"
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: item.revenueRank <= 3 ? 'var(--accent-primary)' : 'var(--border-muted)',
                  color: item.revenueRank <= 3 ? 'white' : 'var(--text-muted)'
                }}
              >
                #{item.revenueRank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{color: 'var(--text-primary)'}}>
                  {item.productTitle}
                </div>
                <div className="text-xs truncate" style={{color: 'var(--text-muted)'}}>
                  {item.variantTitle}
                </div>
              </div>
            </div>

            {/* Revenue and Growth */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                ${item.revenue.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${item.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(item.revenueGrowth).toFixed(1)}%
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor:
                      item.trendStatus === 'Growing' ? '#22c55e20' :
                      item.trendStatus === 'Declining' ? '#b55c5c20' :
                      'var(--border-muted)',
                    color:
                      item.trendStatus === 'Growing' ? '#22c55e' :
                      item.trendStatus === 'Declining' ? '#b55c5c' :
                      'var(--text-muted)'
                  }}
                >
                  {item.trendStatus}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
