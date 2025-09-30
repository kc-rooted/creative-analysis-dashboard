'use client';

interface ProductBundleTableProps {
  data: Array<{
    productA: string;
    productB: string;
    coPurchaseCount: number;
    bundlePrice: number;
  }>;
}

export default function ProductBundleTable({ data }: ProductBundleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
            <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Product Pair</th>
            <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Co-Purchases</th>
            <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Bundle Price</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((item, idx) => (
            <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
              <td className="py-3 px-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold" style={{color: 'var(--text-primary)'}}>
                    {item.productA}
                  </span>
                  <span className="text-xs" style={{color: 'var(--text-secondary)'}}>
                    + {item.productB}
                  </span>
                </div>
              </td>
              <td className="text-right py-3 px-2">
                <span className="font-semibold" style={{color: 'var(--text-primary)'}}>
                  {item.coPurchaseCount}
                </span>
              </td>
              <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>
                ${item.bundlePrice.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
