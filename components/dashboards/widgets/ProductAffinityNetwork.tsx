'use client';

import { useMemo } from 'react';

interface ProductAffinityNetworkProps {
  data: Array<{
    productA: string;
    productB: string;
    coPurchaseCount: number;
  }>;
}

export default function ProductAffinityNetwork({ data }: ProductAffinityNetworkProps) {
  // Get unique products and their connection counts
  const networkData = useMemo(() => {
    const productConnections: Record<string, number> = {};
    const maxConnections = Math.max(...data.slice(0, 15).map(d => d.coPurchaseCount));

    data.slice(0, 15).forEach(item => {
      productConnections[item.productA] = (productConnections[item.productA] || 0) + 1;
      productConnections[item.productB] = (productConnections[item.productB] || 0) + 1;
    });

    return { productConnections, maxConnections };
  }, [data]);

  // Get top 8 most connected products
  const topProducts = useMemo(() => {
    return Object.entries(networkData.productConnections)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [networkData]);

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Network visualization */}
      <div className="relative w-full h-64 flex items-center justify-center">
        {topProducts.map((product, idx) => {
          const angle = (idx / topProducts.length) * 2 * Math.PI;
          const radius = 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const size = 40 + (product.count * 10);

          return (
            <div
              key={idx}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: 'var(--accent-primary)',
                opacity: 0.1 + (product.count / topProducts.length) * 0.6,
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--accent-primary)',
                }}
              />
            </div>
          );
        })}

        {/* Center indicator */}
        <div
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--accent-primary)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 w-full">
        <p className="text-xs text-center mb-2" style={{color: 'var(--text-muted)'}}>
          Most Connected Products
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {topProducts.slice(0, 4).map((product, idx) => (
            <div
              key={idx}
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-muted)'
              }}
            >
              {product.name.split(' ').slice(0, 3).join(' ')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
