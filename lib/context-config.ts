/**
 * Context Category Configuration
 *
 * Defines how each category behaves for:
 * - Temporal relevance (point-in-time, bounded, persistent)
 * - Tail days (how long after an event it remains relevant)
 * - Comparison significance defaults
 * - Report retrieval logic
 */

export interface CategoryConfig {
  // Temporal type
  type: 'point' | 'bounded' | 'persistent' | 'always';

  // For point-in-time events: days after event_date the context remains relevant
  tailDays?: number;

  // For bounded events: buffer days after end_date
  bufferDays?: number;

  // Whether this category typically affects YoY/MoM comparisons
  // Used to set smart defaults, can be overridden by user
  defaultComparisonSignificant: boolean | ((magnitude?: string) => boolean);

  // For comparison retrieval: how far back in the comparison period to look
  // 365 = include in YoY comparison, 0 = never include in comparison
  comparisonWindowDays: number;

  // Human-readable description for the category
  description: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // Point-in-time with tail
  organic_pr_win: {
    type: 'point',
    tailDays: 30,
    defaultComparisonSignificant: true, // Always - PR wins explain YoY differences
    comparisonWindowDays: 365,
    description: 'Press coverage, viral moments, unexpected organic wins',
  },

  influencer: {
    type: 'point',
    tailDays: 21,
    defaultComparisonSignificant: (magnitude) => magnitude === 'major',
    comparisonWindowDays: 365,
    description: 'Influencer partnerships, UGC campaigns, creator content',
  },

  product_launch: {
    type: 'point',
    tailDays: 90, // Long tail for product launches
    defaultComparisonSignificant: true, // Always - new products affect YoY
    comparisonWindowDays: 365,
    description: 'New product releases, product updates, SKU additions',
  },

  promotion: {
    type: 'bounded', // Sales have start/end dates
    bufferDays: 14, // Residual effect after sale ends
    defaultComparisonSignificant: (magnitude) => magnitude === 'major',
    comparisonWindowDays: 365,
    description: 'Sales, discounts, promotional campaigns',
  },

  budget_change: {
    type: 'point',
    tailDays: 7,
    defaultComparisonSignificant: false, // Budget changes are execution, not comparison
    comparisonWindowDays: 0,
    description: 'Spend adjustments - increased/decreased budget',
  },

  competitor: {
    type: 'point',
    tailDays: 30,
    defaultComparisonSignificant: (magnitude) => magnitude === 'major',
    comparisonWindowDays: 365,
    description: 'Competitor activities, market movements',
  },

  // Bounded events
  site_issue: {
    type: 'bounded',
    bufferDays: 7,
    defaultComparisonSignificant: (magnitude) => magnitude === 'major',
    comparisonWindowDays: 365,
    description: 'Website problems, checkout issues, page errors',
  },

  inventory_issue: {
    type: 'bounded',
    bufferDays: 7,
    defaultComparisonSignificant: (magnitude) => magnitude === 'major' || magnitude === 'moderate',
    comparisonWindowDays: 365,
    description: 'Stock constraints, out-of-stock events, supply chain problems',
  },

  // Persistent categories (until superseded)
  paid_media_strategy: {
    type: 'persistent',
    defaultComparisonSignificant: false, // Strategy is execution context, not comparison
    comparisonWindowDays: 0,
    description: 'Paid media strategy changes (ABO testing, audience segments, bidding)',
  },

  organic_social_strategy: {
    type: 'persistent',
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Organic social strategy (posting frequency, content pillars, platform focus)',
  },

  business_strategy: {
    type: 'persistent',
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Business-level decisions (new markets, pricing, distribution)',
  },

  market_trend: {
    type: 'persistent',
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Industry trends, market shifts',
  },

  standing_condition: {
    type: 'persistent',
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Chronic/ongoing constraints (inventory limits, shipping delays)',
  },

  // Always included
  brand_details: {
    type: 'always',
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Brand positioning, messaging, target audience, USPs',
  },

  // Fallback
  other: {
    type: 'point',
    tailDays: 14,
    defaultComparisonSignificant: false,
    comparisonWindowDays: 0,
    description: 'Other significant context',
  },
};

/**
 * Get the default comparison_significant value for a category
 */
export function getDefaultComparisonSignificant(category: string, magnitude?: string): boolean {
  const config = CATEGORY_CONFIG[category];
  if (!config) return false;

  const defaultValue = config.defaultComparisonSignificant;
  if (typeof defaultValue === 'function') {
    return defaultValue(magnitude);
  }
  return defaultValue;
}

/**
 * Get tail days for a point-in-time category
 */
export function getTailDays(category: string): number {
  const config = CATEGORY_CONFIG[category];
  if (!config || config.type !== 'point') return 0;
  return config.tailDays || 0;
}

/**
 * Get buffer days for a bounded category
 */
export function getBufferDays(category: string): number {
  const config = CATEGORY_CONFIG[category];
  if (!config || config.type !== 'bounded') return 0;
  return config.bufferDays || 0;
}

/**
 * Check if a category should always be included in reports
 */
export function isAlwaysIncluded(category: string): boolean {
  const config = CATEGORY_CONFIG[category];
  return config?.type === 'always';
}

/**
 * Check if a category is persistent (until superseded)
 */
export function isPersistent(category: string): boolean {
  const config = CATEGORY_CONFIG[category];
  return config?.type === 'persistent';
}

/**
 * Get comparison window days for a category
 */
export function getComparisonWindowDays(category: string): number {
  const config = CATEGORY_CONFIG[category];
  return config?.comparisonWindowDays || 0;
}
