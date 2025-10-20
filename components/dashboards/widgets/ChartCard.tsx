'use client';

import { DateRange } from '@/types/dashboard';
import { FrownIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartCardProps {
  title: string;
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'funnel' | 'heatmap';
  dateRange: DateRange;
  data?: any[];
  className?: string;
  comparisonType?: 'previous-period' | 'previous-year';
}

// Design system colors
const CHART_COLORS = {
  primary: '#89cdee',
  secondary: '#7bc0e8',
  tertiary: '#6bb6e3',
  quaternary: '#5aafde',
  quinternary: '#4ba4d9',
  monochromatic: ['#89cdee', '#7bc0e8', '#6bb6e3', '#5aafde', '#4ba4d9']
};

// Dark theme styling for charts
const CHART_THEME = {
  textColor: '#94a3b8', // var(--text-muted)
  gridColor: 'rgba(255, 255, 255, 0.05)', // var(--border-muted)
  tooltipBg: 'rgba(255, 255, 255, 0.025)', // var(--bg-card)
  tooltipBorder: 'rgba(255, 255, 255, 0.05)', // var(--border-muted)
};

export default function ChartCard({ title, type, dateRange, data, className = '', comparisonType = 'previous-period' }: ChartCardProps) {
  // If no data is provided, show a placeholder
  if (!data || data.length === 0) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
              {title}
            </h3>
            <div className="text-sm" style={{color: 'var(--text-muted)'}}>
              Month-to-Date
            </div>
          </div>
          <div className="w-full h-[300px] flex flex-col items-center justify-center">
            <FrownIcon className="h-16 w-16 mb-4" style={{color: 'var(--text-muted)'}} />
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>No data available</p>
          </div>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                tickFormatter={(value) => {
                  const [year, month, day] = value.split('-');
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc'
                }}
                labelFormatter={(value) => {
                  const [year, month, day] = value.split('-');
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString();
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                fill={(entry: any, index: number) => CHART_COLORS.monochromatic[index % CHART_COLORS.monochromatic.length]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS.monochromatic[index % CHART_COLORS.monochromatic.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                innerRadius={type === 'donut' ? 40 : 0}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS.monochromatic[index % CHART_COLORS.monochromatic.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc'
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
              />
              <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <div className="h-72 rounded-lg flex items-center justify-center" style={{background: 'var(--bg-elevated)'}}>
            <p style={{color: 'var(--text-muted)'}}>
              Heatmap visualization will be implemented with a specialized library
            </p>
          </div>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                tickFormatter={(value) => {
                  const [year, month, day] = value.split('-');
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_THEME.textColor }}
                axisLine={{ stroke: CHART_THEME.gridColor }}
                tickLine={{ stroke: CHART_THEME.gridColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc'
                }}
                labelFormatter={(value) => {
                  const [year, month, day] = value.split('-');
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString();
                }}
                formatter={(value: any, name: string, props: any) => {
                  // Check if it's ROAS based on the dataKey, not the display name
                  const dataKey = props?.dataKey || '';
                  const isRoas = dataKey.includes('roas');
                  const numValue = typeof value === 'string' ? parseFloat(value) : value;
                  const formattedValue = isRoas ? `${numValue.toFixed(2)}x` : `$${numValue.toLocaleString()}`;
                  return [formattedValue, name];
                }}
              />
              {data[0]?.revenue !== undefined && (
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#22c55e' }}
                />
              )}
              {data[0]?.revenue_cy !== undefined && (
                <Line
                  type="monotone"
                  dataKey="revenue_cy"
                  name="Current Year"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#22c55e' }}
                />
              )}
              {data[0]?.revenue_ly !== undefined && (
                <Line
                  type="monotone"
                  dataKey="revenue_ly"
                  name="Last Year"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#94a3b8', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#94a3b8' }}
                />
              )}
              {data[0]?.purchases !== undefined && (
                <Line
                  type="monotone"
                  dataKey="purchases"
                  name="Purchases"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#f59e0b' }}
                />
              )}
              {data[0]?.spend !== undefined && (
                <Line
                  type="monotone"
                  dataKey="spend"
                  name="Spend"
                  stroke="#89cdee"
                  strokeWidth={2}
                  dot={{ fill: '#89cdee', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#89cdee' }}
                />
              )}
              {data[0]?.roas !== undefined && (
                <Line
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#8b5cf6' }}
                />
              )}
              <Legend
                wrapperStyle={{ color: CHART_THEME.textColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
            {title}
          </h3>
          <div className="text-sm" style={{color: 'var(--text-muted)'}}>
            Month-to-Date
          </div>
        </div>

        <div className="w-full">
          {renderChart()}
        </div>
      </div>
    </div>
  );
}