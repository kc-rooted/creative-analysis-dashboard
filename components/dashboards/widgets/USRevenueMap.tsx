'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

interface USRevenueMapProps {
  data: Array<{
    state: string;
    revenue: number;
  }>;
}

// State name to abbreviation mapping
const stateNameToAbbr: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC'
};

export default function USRevenueMap({ data }: USRevenueMapProps) {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Create a map of state names (from data) to revenue
  const revenueByStateName = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      map[item.state] = item.revenue;
    });
    return map;
  }, [data]);

  // Calculate revenue ranges for color scaling
  const { minRevenue, maxRevenue } = useMemo(() => {
    const revenues = Object.values(revenueByStateName);
    if (revenues.length === 0) return { minRevenue: 0, maxRevenue: 1 };
    return {
      minRevenue: Math.min(...revenues),
      maxRevenue: Math.max(...revenues)
    };
  }, [revenueByStateName]);

  // Get color based on revenue (light blue to dark blue)
  const getColor = (stateName: string) => {
    const revenue = revenueByStateName[stateName];
    if (!revenue) return '#e5e7eb'; // Gray for no data

    // Normalize revenue to 0-1 scale
    const normalized = (revenue - minRevenue) / (maxRevenue - minRevenue);

    // Create color scale from light blue to dark blue
    const lightness = 90 - (normalized * 60); // 90% to 30% lightness
    return `hsl(210, 80%, ${lightness}%)`;
  };

  return (
    <div className="w-full relative">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000,
        }}
        style={{
          width: '100%',
          height: 'auto',
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name;
              const revenue = revenueByStateName[stateName];

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(stateName)}
                  stroke="#999"
                  strokeWidth={0.5}
                  onMouseEnter={() => {
                    setTooltipContent(
                      revenue
                        ? `${stateName}: $${revenue.toLocaleString()}`
                        : `${stateName}: No data`
                    );
                    setTooltipVisible(true);
                  }}
                  onMouseLeave={() => {
                    setTooltipVisible(false);
                  }}
                  style={{
                    default: { outline: 'none' },
                    hover: {
                      fill: '#3b82f6',
                      outline: 'none',
                      cursor: 'pointer'
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipVisible && tooltipContent && (
        <div
          className="absolute top-0 left-0 px-3 py-2 text-sm rounded-lg shadow-lg pointer-events-none"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-primary)',
            zIndex: 1000
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-xs" style={{color: 'var(--text-muted)'}}>
          ${(minRevenue / 1000).toFixed(0)}K
        </span>
        <div className="flex h-4 w-48 rounded overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => {
            const lightness = 90 - (i / 9) * 60;
            return (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: `hsl(210, 80%, ${lightness}%)` }}
              />
            );
          })}
        </div>
        <span className="text-xs" style={{color: 'var(--text-muted)'}}>
          ${(maxRevenue / 1000).toFixed(0)}K
        </span>
      </div>
    </div>
  );
}
