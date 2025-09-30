'use client';

import { useState, useMemo } from 'react';

interface ProductAlsoBoughtProps {
  data: Array<{
    productA: string;
    productB: string;
    coPurchaseCount: number;
    bundlePrice: number;
  }>;
}

export default function ProductAlsoBought({ data }: ProductAlsoBoughtProps) {
  // Get unique products for dropdown
  const products = useMemo(() => {
    const productSet = new Set<string>();
    data.forEach(item => {
      productSet.add(item.productA);
      productSet.add(item.productB);
    });
    return Array.from(productSet).sort();
  }, [data]);

  const [selectedProduct, setSelectedProduct] = useState<string>(products[0] || '');

  // Find products commonly purchased with selected product
  const recommendations = useMemo(() => {
    if (!selectedProduct) return [];

    const recs = data.filter(
      item => item.productA === selectedProduct || item.productB === selectedProduct
    ).map(item => ({
      product: item.productA === selectedProduct ? item.productB : item.productA,
      count: item.coPurchaseCount,
      bundlePrice: item.bundlePrice
    })).sort((a, b) => b.count - a.count);

    return recs.slice(0, 5);
  }, [selectedProduct, data]);

  return (
    <div className="flex flex-col gap-4">
      {/* Product selector */}
      <div>
        <label className="block text-xs mb-2" style={{color: 'var(--text-muted)'}}>
          Select a product
        </label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-primary)'
          }}
        >
          {products.map((product, idx) => (
            <option key={idx} value={product}>
              {product}
            </option>
          ))}
        </select>
      </div>

      {/* Recommendations */}
      <div>
        <p className="text-xs mb-3" style={{color: 'var(--text-muted)'}}>
          Customers also bought:
        </p>
        <div className="space-y-2">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-primary-30)',
                border: '1px solid var(--border-muted)'
              }}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs flex-1" style={{color: 'var(--text-primary)'}}>
                  {rec.product}
                </span>
                <span className="text-xs font-semibold whitespace-nowrap" style={{color: 'var(--accent-primary)'}}>
                  {rec.count}x
                </span>
              </div>
              <div className="mt-1 text-xs" style={{color: 'var(--text-muted)'}}>
                Bundle: ${rec.bundlePrice.toFixed(2)}
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-xs text-center py-4" style={{color: 'var(--text-muted)'}}>
              No recommendations available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
