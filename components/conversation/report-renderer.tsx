'use client';

import type { Report, Block } from '@/lib/report-schema';
import React from 'react';
import dynamic from 'next/dynamic';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Dynamic import for VegaLite to avoid SSR issues
const VegaLite = dynamic(
  () => import('react-vega').then((mod) => mod.VegaLite),
  { 
    ssr: false,
    loading: () => <div className="h-72 bg-gray-100 rounded flex items-center justify-center">Loading chart...</div>
  }
);

// Memoized VegaChart component to prevent re-renders
const VegaChart = React.memo(({ spec, title }: { spec: any; title?: string }) => (
  <div className="space-y-2">
    {title && <h4 className="text-lg font-semibold">{title}</h4>}
    <VegaLite spec={spec} actions={false} />
  </div>
));

VegaChart.displayName = 'VegaChart';

// Color palette for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const BasicChart = React.memo(({ type, x, y, rows, title }: any) => {
  const commonProps = React.useMemo(() => ({
    data: rows,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }), [rows]);

  const chartElement = React.useMemo(() => {
    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <XAxis dataKey={x} />
            <YAxis />
            <Tooltip />
            <Legend />
            {y.map((key: string, index: number) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <XAxis dataKey={x} />
            <YAxis />
            <Tooltip />
            <Legend />
            {y.map((key: string, index: number) => (
              <Area
                key={key}
                dataKey={key}
                stackId="1"
                fill={COLORS[index % COLORS.length]}
                stroke={COLORS[index % COLORS.length]}
              />
            ))}
          </AreaChart>
        );
      case 'pie':
        // For pie charts, use the first y value as the data key
        const dataKey = y[0];
        return (
          <PieChart>
            <Pie
              data={rows}
              dataKey={dataKey}
              nameKey={x}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {rows.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      default: // line
        return (
          <LineChart {...commonProps}>
            <XAxis dataKey={x} />
            <YAxis />
            <Tooltip />
            <Legend />
            {y.map((key: string, index: number) => (
              <Line
                key={key}
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length] }}
              />
            ))}
          </LineChart>
        );
    }
  }, [type, x, y, commonProps]);

  return (
    <div className="space-y-2">
      {title && <h4 className="text-lg font-semibold">{title}</h4>}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

BasicChart.displayName = 'BasicChart';

const KPICard = React.memo(({ title, value, change, trend }: { title: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'neutral' }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 ${getChangeColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{change}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

const BlockRenderer = React.memo(({ block }: { block: Block }) => {
  switch (block.kind) {
    case 'text': {
      const Tag = block.variant as keyof JSX.IntrinsicElements;
      
      const getClassName = (variant: string) => {
        switch (variant) {
          case 'h1': return 'text-3xl font-bold mb-4';
          case 'h2': return 'text-2xl font-semibold mb-3';
          case 'h3': return 'text-xl font-semibold mb-2';
          case 'h4': return 'text-lg font-medium mb-2';
          case 'h5': return 'text-base font-medium mb-1';
          case 'h6': return 'text-sm font-medium mb-1';
          case 'p': return 'text-base mb-2';
          case 'small': return 'text-sm text-gray-600';
          default: return '';
        }
      };

      return (
        <div className="prose prose-neutral max-w-none">
          <Tag className={getClassName(block.variant)}>
            {block.content}
          </Tag>
        </div>
      );
    }
    
    case 'table':
      return (
        <div className="space-y-2">
          {block.title && <h4 className="text-lg font-semibold">{block.title}</h4>}
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {block.columns.map(col => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {block.rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {block.columns.map(col => (
                      <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    
    case 'kpi':
      return <KPICard {...block} />;
    
    case 'chart':
      return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {block.chart.mode === 'vega' ? (
            <VegaChart spec={block.chart.spec} title={block.title} />
          ) : (
            <BasicChart {...block.chart} title={block.title} />
          )}
        </div>
      );
    
    case 'image':
      return (
        <div className="space-y-2">
          <img 
            src={block.url} 
            alt={block.alt} 
            className="w-full h-auto rounded-lg shadow-sm"
          />
          {block.caption && (
            <p className="text-sm text-gray-600 italic text-center">{block.caption}</p>
          )}
        </div>
      );
    
    case 'divider':
      return block.style === 'space' ? (
        <div className="h-8" />
      ) : (
        <hr className="border-gray-300" />
      );
  }
});

BlockRenderer.displayName = 'BlockRenderer';

export const ReportRenderer = React.memo(({ report }: { report: Report }) => {
  return (
    <article className="max-w-6xl mx-auto space-y-8 p-6 bg-gray-50 rounded-xl">
      {/* Header */}
      {(report.title || report.subtitle) && (
        <header className="text-center space-y-2 pb-6 border-b border-gray-200">
          {report.title && (
            <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
          )}
          {report.subtitle && (
            <p className="text-lg text-gray-600">{report.subtitle}</p>
          )}
        </header>
      )}
      
      {/* Sections */}
      {report.sections.map((section, i) => (
        <section 
          key={i} 
          className={`grid gap-6 ${
            section.columns === 1 ? '' :
            section.columns === 2 ? 'md:grid-cols-2' :
            section.columns === 3 ? 'md:grid-cols-3' :
            'md:grid-cols-4'
          }`}
        >
          {section.blocks.map((block, j) => (
            <div key={j} className={section.columns > 1 ? 'h-fit' : ''}>
              <BlockRenderer block={block} />
            </div>
          ))}
        </section>
      ))}
      
      {/* Footer */}
      {report.footer && (
        <footer className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
          {report.footer}
        </footer>
      )}
    </article>
  );
});

ReportRenderer.displayName = 'ReportRenderer';