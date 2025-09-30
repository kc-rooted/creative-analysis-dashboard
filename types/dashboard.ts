export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'monthToDate'
  | 'quarterToDate'
  | 'yearToDate'
  | 'lastMonth'
  | 'lastQuarter'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: Date | null;
  endDate: Date | null;
}

export interface DashboardSection {
  id: string;
  label: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface MetricData {
  label: string;
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
  target?: number;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'bullet' | 'waterfall';
  title: string;
  description?: string;
  gridArea?: string; // For CSS Grid placement
  data?: any;
  config?: any;
}