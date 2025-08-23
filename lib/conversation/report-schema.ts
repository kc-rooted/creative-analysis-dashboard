import { z } from 'zod';

// Text blocks for headers, paragraphs, etc.
export const TextBlock = z.object({
  kind: z.literal('text'),
  variant: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'small']).default('p'),
  content: z.string(), // supports markdown
});

// Table blocks for structured data
export const TableBlock = z.object({
  kind: z.literal('table'),
  title: z.string().optional(),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).default([]),
});

// KPI/Metric blocks for key numbers
export const KPIBlock = z.object({
  kind: z.literal('kpi'),
  title: z.string(),
  value: z.union([z.string(), z.number()]),
  change: z.string().optional(), // e.g., "+12%" or "-5%"
  trend: z.enum(['up', 'down', 'neutral']).optional(),
});

// Simple chart specification using recharts
const BasicChart = z.object({
  mode: z.literal('basic'),
  type: z.enum(['line', 'bar', 'area', 'pie']),
  x: z.string(), // x-axis key
  y: z.array(z.string()).min(1), // y-axis keys (can be multiple for multi-series)
  rows: z.array(z.record(z.union([z.string(), z.number()]))),
});

// Advanced chart using Vega-Lite specification
const VegaChart = z.object({
  mode: z.literal('vega'),
  spec: z.any(), // Vega-Lite JSON spec
});

export const ChartBlock = z.object({
  kind: z.literal('chart'),
  title: z.string().optional(),
  chart: z.discriminatedUnion('mode', [BasicChart, VegaChart]),
});

// Image blocks
export const ImageBlock = z.object({
  kind: z.literal('image'),
  alt: z.string(),
  url: z.string(),
  caption: z.string().optional(),
});

// Divider for visual separation
export const DividerBlock = z.object({
  kind: z.literal('divider'),
  style: z.enum(['line', 'space']).default('line'),
});

// Union of all block types
export const Block = z.discriminatedUnion('kind', [
  TextBlock,
  TableBlock,
  KPIBlock,
  ChartBlock,
  ImageBlock,
  DividerBlock,
]);

// Section containing blocks in a column layout
export const Section = z.object({
  columns: z.number().min(1).max(4).default(1),
  blocks: z.array(Block).min(1),
});

// Complete report structure
export const Report = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  sections: z.array(Section).min(1),
  footer: z.string().optional(),
});

// Type exports for TypeScript
export type Report = z.infer<typeof Report>;
export type Block = z.infer<typeof Block>;
export type Section = z.infer<typeof Section>;
export type TextBlock = z.infer<typeof TextBlock>;
export type TableBlock = z.infer<typeof TableBlock>;
export type KPIBlock = z.infer<typeof KPIBlock>;
export type ChartBlock = z.infer<typeof ChartBlock>;
export type ImageBlock = z.infer<typeof ImageBlock>;
export type DividerBlock = z.infer<typeof DividerBlock>;