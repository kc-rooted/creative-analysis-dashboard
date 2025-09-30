import { BigQuery } from '@google-cloud/bigquery';
import { getCurrentClientConfigSync, CLIENT_CONFIGS } from './client-config';

// Initialize BigQuery client (same for all clients)
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

// Get current client's dataset
function getCurrentDataset() {
  const clientConfig = getCurrentClientConfigSync();
  return bigquery.dataset(clientConfig.bigquery.dataset);
}

// Helper to get current dataset name safely
function getCurrentDatasetName(): string {
  try {
    const clientConfig = getCurrentClientConfigSync();
    return clientConfig.bigquery.dataset;
  } catch (error) {
    console.error('Error getting client config, falling back to environment variable:', error);
    // Fallback to hardcoded dataset if client config fails
    return process.env.BIGQUERY_DATASET || 'jumbomax_analytics';
  }
}

// Helper to build table reference with current client config
function getTableReference(tableName: string): string {
  const datasetName = getCurrentDatasetName();
  return `\`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.${tableName}\``;
}

export interface Creative {
  content_id: string;
  representative_creative_name: string;
  cleaned_creative_name?: string;
  primary_image_url: string;
  thumbnail_url?: string;
  video_id?: string;
  total_usage_count: number;
  total_campaigns: number;
  all_creative_ids: string[];
  platforms_used: string[];
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis_priority: number;
  roas?: number;
  creative_tags?: string[];
  themes?: string[];
  brand_elements?: string[];
  color_palette?: string[];
  sentiment?: string;
  visual_style?: string;
  messaging_tone?: string;
  target_audience?: string;
  confidence_score?: number;
  last_updated?: string;
  first_seen?: string;
}

export interface AnalysisStats {
  analysis_status: string;
  unique_images: number;
  total_campaign_impact: number;
}

export interface CampaignUsage {
  creative_id: string;
  creative_name: string;
  platform: string;
  ad_text?: string;
  ad_title?: string;
  last_updated: string;
}

export async function getDeduplicatedCreatives(
  status?: string,
  limit: number = 50,
  offset: number = 0,
  sortBy: 'priority' | 'date' | 'usage' | 'roas' | 'analyzed' = 'roas'
): Promise<Creative[]> {
  let query = `
    SELECT DISTINCT
      cpd.content_id,
      IFNULL(cpd.representative_creative_name, '') as representative_creative_name,
      IFNULL(cpd.cleaned_creative_name, '') as cleaned_creative_name,
      IFNULL(cpd.primary_image_url, '') as primary_image_url,
      cpd.thumbnail_url,
      cpd.video_id,
      IFNULL(cpd.total_usage_count, 0) as total_usage_count,
      IFNULL(cpd.total_campaigns, 0) as total_campaigns,
      [] as all_creative_ids,
      IFNULL(cpd.platforms_used, []) as platforms_used,
      IFNULL(ca.analysis_status, 'pending') as analysis_status,
      IFNULL(ca.analysis_priority, 0) as analysis_priority,
      IFNULL(cpd.roas, 0) as roas,
      IFNULL(ca.creative_tags, []) as creative_tags,
      IFNULL(ca.themes, []) as themes,
      IFNULL(ca.brand_elements, []) as brand_elements,
      IFNULL(ca.color_palette, []) as color_palette,
      ca.sentiment,
      ca.visual_style,
      ca.messaging_tone,
      ca.target_audience,
      ca.confidence_score,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.last_seen) as last_updated,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.first_seen) as first_seen,
      
      -- Add fields needed for ORDER BY when using DISTINCT
      ca.analysis_priority,
      cpd.last_seen as last_seen_raw,
      cpd.total_campaigns as total_campaigns_sort,
      cpd.total_usage_count as total_usage_count_sort,
      cpd.roas as roas_sort,
      ca.analysis_date as analysis_date_sort
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
      ON cpd.content_id = ca.content_id
  `;

  query += ` WHERE cpd.creative_type != 'NO_VISUAL'`;
  
  if (status) {
    query += ` AND ca.analysis_status = @status`;
  }

  switch (sortBy) {
    case 'priority':
      query += ' ORDER BY analysis_priority DESC';
      break;
    case 'date':
      query += ' ORDER BY last_seen_raw DESC';
      break;
    case 'usage':
      query += ' ORDER BY total_campaigns_sort DESC, total_usage_count_sort DESC';
      break;
    case 'roas':
      query += ' ORDER BY roas_sort DESC';
      break;
    case 'analyzed':
      query += ' ORDER BY analysis_date_sort DESC';
      break;
  }

  query += ` LIMIT @limit OFFSET @offset`;

  const params: any = {
    limit,
    offset,
  };

  // Only add status to params if it's defined
  if (status) {
    params.status = status;
  }

  const options = {
    query,
    params,
  };

  const [rows] = await bigquery.query(options);
  return rows as Creative[];
}

export async function getAnalysisStatistics(): Promise<AnalysisStats[]> {
  const query = `
    SELECT 
      'pending' as analysis_status,
      COUNT(DISTINCT cpd.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
      ON cpd.content_id = ca.content_id
    WHERE cpd.creative_type != 'NO_VISUAL' 
      AND cpd.video_id IS NULL
      AND (ca.content_id IS NULL OR ca.analysis_status IS NULL OR ca.analysis_status = 'pending')
    
    UNION ALL
    
    SELECT 
      ca.analysis_status,
      COUNT(DISTINCT ca.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
    JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
      ON ca.content_id = cpd.content_id
    WHERE cpd.creative_type != 'NO_VISUAL' 
      AND cpd.video_id IS NULL
      AND ca.analysis_status IS NOT NULL AND ca.analysis_status != 'pending'
    GROUP BY ca.analysis_status
  `;

  const [rows] = await bigquery.query(query);
  return rows as AnalysisStats[];
}

export async function getCampaignUsage(imageUrl: string): Promise<CampaignUsage[]> {
  const query = `
    SELECT 
      creative_id,
      creative_name,
      platform,
      ad_text,
      ad_title,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', last_updated) as last_updated
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.unified_creative_inventory\`
    WHERE primary_image_url = @imageUrl
    ORDER BY last_updated DESC
  `;

  const options = {
    query,
    params: { imageUrl },
  };

  const [rows] = await bigquery.query(options);
  return rows as CampaignUsage[];
}

export async function updateAnalysisStatus(
  creativeId: string,
  status: 'analyzing' | 'completed' | 'failed',
  analysisData?: any
) {
  const table = dataset.table('creative_analysis');

  const row = {
    creative_id: creativeId,
    analysis_status: status,
    analysis_timestamp: new Date().toISOString(),
    ...(analysisData || {}),
  };

  await table.insert([row]);
}

export async function triggerAnalysis(contentIds: string[]): Promise<void> {
  // Mark creatives for analysis
  for (const contentId of contentIds) {
    await updateAnalysisStatus(contentId, 'analyzing');
  }
}

export async function updateCreativeTags(
  contentId: string,
  tags: string[]
): Promise<void> {
  const query = `
    UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\`
    SET creative_tags = @tags,
        last_updated = CURRENT_TIMESTAMP()
    WHERE content_id = @contentId
  `;

  const options = {
    query,
    params: { contentId, tags },
  };

  await bigquery.query(options);
}

// Function for conversation tools to execute SQL queries (from intelligence-ai)
export async function runSQLQuery(sql: string) {
  try {
    // Timeout for long-running queries
    const queryOptions = {
      query: sql,
      timeoutMs: 30000, // 30 seconds timeout
    };
    
    const [rows] = await bigquery.query(queryOptions);
    return rows;
  } catch (error) {
    console.error('BigQuery Error:', error);
    // Enhance error message with specific BigQuery errors
    if (error instanceof Error) {
      if (error.message.includes('Not found')) {
        throw new Error('Table or dataset not found');
      } else if (error.message.includes('Syntax error')) {
        throw new Error(`SQL syntax error: ${error.message}`);
      } else if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied for this query');
      }
    }
    // Re-throw for the tool's catch block to handle
    throw error;
  }
}

export async function runSchemaQuery(sql: string) {
  try {
    const [rows] = await bigquery.query(sql);
    return rows;
  } catch (error) {
    console.error('Schema Query Error:', error);
    throw error;
  }
}

// Dashboard data interface
export interface ExecutiveSummary {
  shopify_mtd_revenue?: number;
  shopify_mtd_revenue_yoy_change?: number;
  shopify_7d_revenue?: number;
  shopify_7d_revenue_yoy_change?: number;
  shopify_30d_revenue?: number;
  shopify_30d_revenue_yoy_change?: number;
  blended_roas_mtd?: number;
  blended_roas_mtd_yoy_change?: number;
  blended_roas_7d?: number;
  blended_roas_7d_yoy_change?: number;
  blended_roas_30d?: number;
  blended_roas_30d_yoy_change?: number;
  total_spend_mtd?: number;
  total_spend_7d?: number;
  total_spend_30d?: number;
  email_revenue_mtd?: number;
  email_revenue_mtd_yoy_change?: number;
  email_revenue_7d?: number;
  email_revenue_7d_yoy_change?: number;
  email_revenue_per_send_mtd?: number;
  email_open_rate_mtd?: number;
  email_click_rate_mtd?: number;
  customer_ltv?: number;
  customer_ltv_trend?: number;
  predicted_clv?: number;
  churn_risk_customers?: number;
  top_product_revenue?: number;
  top_product_trend?: number;
  top_product_units?: number;
  top_product_inventory?: number;
}

// Get paid media trend data for dashboard
export async function getPaidMediaTrend(): Promise<any[]> {
  const query = `
    SELECT
      date,
      SUM(revenue) as revenue,
      SUM(spend) as spend,
      SUM(purchases) as orders,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
    WHERE date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
      AND date < CURRENT_DATE()
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      date: row.date.value,
      revenue: Math.round(row.revenue || 0),
      spend: Math.round(row.spend || 0),
      orders: row.orders || 0,
      roas: (row.roas || 0).toFixed(2)
    }));
  } catch (error) {
    console.error('Error fetching paid media trend:', error);
    throw error;
  }
}

// Get 7-day revenue forecast aggregates
export async function getRevenueForecast7Day(): Promise<any> {
  const query = `
    SELECT
      SUM(forecasted_revenue) as total_forecasted_revenue,
      SUM(lower_bound) as total_lower_bound,
      SUM(upper_bound) as total_upper_bound,
      SUM(suggested_spend) as total_suggested_spend,
      AVG(expected_roas) as avg_expected_roas,
      COUNT(*) as forecast_days
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_comprehensive_revenue_forecast_7day\`
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      totalForecasted: Math.round(row.total_forecasted_revenue || 0),
      lowerBound: Math.round(row.total_lower_bound || 0),
      upperBound: Math.round(row.total_upper_bound || 0),
      suggestedSpend: Math.round(row.total_suggested_spend || 0),
      expectedRoas: parseFloat((row.avg_expected_roas || 0).toFixed(2)),
      forecastDays: row.forecast_days || 7
    };
  } catch (error) {
    console.error('Error fetching revenue forecast:', error);
    return null;
  }
}

// Helper function to generate date filter SQL with comparison periods
function getDateFilterSQL(preset: string, startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): {
  revenueFilter: string,
  campaignFilter: string,
  prevRevenueFilter: string,
  prevCampaignFilter: string,
  prevYearRevenueFilter: string,
  prevYearCampaignFilter: string
} {
  const yesterday = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';

  switch (preset) {
    case 'yesterday':
      return {
        revenueFilter: `purchase_date = ${yesterday}`,
        campaignFilter: `send_date = ${yesterday}`,
        // Previous period: day before yesterday
        prevRevenueFilter: `purchase_date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)`,
        prevCampaignFilter: `send_date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)`,
        // Previous year: same day last year
        prevYearRevenueFilter: `purchase_date = DATE_SUB(${yesterday}, INTERVAL 1 YEAR)`,
        prevYearCampaignFilter: `send_date = DATE_SUB(${yesterday}, INTERVAL 1 YEAR)`
      };
    case 'last7':
      return {
        revenueFilter: `purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND purchase_date < CURRENT_DATE()`,
        campaignFilter: `send_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND send_date < CURRENT_DATE()`,
        // Previous period: 7 days before that
        prevRevenueFilter: `purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
        prevCampaignFilter: `send_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
        // Previous year: same 7 days last year
        prevYearRevenueFilter: `purchase_date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), INTERVAL 1 YEAR) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        prevYearCampaignFilter: `send_date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), INTERVAL 1 YEAR) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`
      };
    case 'ytd':
      return {
        revenueFilter: `purchase_date >= DATE_TRUNC(CURRENT_DATE(), YEAR) AND purchase_date < CURRENT_DATE()`,
        campaignFilter: `send_date >= DATE_TRUNC(CURRENT_DATE(), YEAR) AND send_date < CURRENT_DATE()`,
        // Previous period: same period last year
        prevRevenueFilter: `purchase_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL 1 YEAR) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        prevCampaignFilter: `send_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL 1 YEAR) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        // Previous year: same as previous period for YTD
        prevYearRevenueFilter: `purchase_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL 1 YEAR) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        prevYearCampaignFilter: `send_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL 1 YEAR) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`
      };
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Start and end dates required for custom range');
      }
      // Calculate the number of days in the custom range
      const daysDiff = `DATE_DIFF('${endDate}', '${startDate}', DAY) + 1`;
      return {
        revenueFilter: `purchase_date >= '${startDate}' AND purchase_date <= '${endDate}'`,
        campaignFilter: `send_date >= '${startDate}' AND send_date <= '${endDate}'`,
        // Previous period: same number of days before start date
        prevRevenueFilter: `purchase_date >= DATE_SUB('${startDate}', INTERVAL ${daysDiff} DAY) AND purchase_date < '${startDate}'`,
        prevCampaignFilter: `send_date >= DATE_SUB('${startDate}', INTERVAL ${daysDiff} DAY) AND send_date < '${startDate}'`,
        // Previous year: same dates last year
        prevYearRevenueFilter: `purchase_date >= DATE_SUB('${startDate}', INTERVAL 1 YEAR) AND purchase_date <= DATE_SUB('${endDate}', INTERVAL 1 YEAR)`,
        prevYearCampaignFilter: `send_date >= DATE_SUB('${startDate}', INTERVAL 1 YEAR) AND send_date <= DATE_SUB('${endDate}', INTERVAL 1 YEAR)`
      };
    case 'mtd':
    default:
      return {
        revenueFilter: `purchase_date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND purchase_date < CURRENT_DATE()`,
        campaignFilter: `send_date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND send_date < CURRENT_DATE()`,
        // Previous period: same days of previous month
        prevRevenueFilter: `purchase_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)`,
        prevCampaignFilter: `send_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)`,
        // Previous year: same dates last year
        prevYearRevenueFilter: `purchase_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 YEAR) AND purchase_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        prevYearCampaignFilter: `send_date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 YEAR) AND send_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`
      };
  }
}

// Get email dashboard KPIs and metrics
export async function getEmailDashboardData(preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any> {
  const filters = getDateFilterSQL(preset, startDate, endDate, comparisonType);

  // Choose which comparison filter to use
  const comparisonRevenueFilter = comparisonType === 'previous-year' ? filters.prevYearRevenueFilter : filters.prevRevenueFilter;
  const comparisonCampaignFilter = comparisonType === 'previous-year' ? filters.prevYearCampaignFilter : filters.prevCampaignFilter;

  const query = `
    WITH revenue_data AS (
      SELECT
        SUM(CASE WHEN attributed_email_type = 'Campaign' THEN attributed_revenue ELSE 0 END) as campaign_revenue_mtd,
        SUM(CASE WHEN attributed_email_type = 'Flow' THEN attributed_revenue ELSE 0 END) as flow_revenue_mtd,
        SUM(attributed_revenue) as total_email_revenue_mtd
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_daily_unified_attribution\`
      WHERE ${filters.revenueFilter}
    ),
    prev_revenue_data AS (
      SELECT
        SUM(CASE WHEN attributed_email_type = 'Campaign' THEN attributed_revenue ELSE 0 END) as prev_campaign_revenue,
        SUM(CASE WHEN attributed_email_type = 'Flow' THEN attributed_revenue ELSE 0 END) as prev_flow_revenue,
        SUM(attributed_revenue) as prev_total_email_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_daily_unified_attribution\`
      WHERE ${comparisonRevenueFilter}
    ),
    total_shopify_revenue AS (
      SELECT
        SUM(revenue) as total_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.daily_business_metrics\`
      WHERE ${filters.revenueFilter.replace(/purchase_date/g, 'date')}
    ),
    prev_total_shopify_revenue AS (
      SELECT
        SUM(revenue) as prev_total_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.daily_business_metrics\`
      WHERE ${comparisonRevenueFilter.replace(/purchase_date/g, 'date')}
    ),
    metrics_data AS (
      SELECT
        -- Use total opens/sends for accurate rates, not average of rates
        SAFE_DIVIDE(SUM(opens), SUM(sends)) as avg_open_rate,
        SAFE_DIVIDE(SUM(clicks), SUM(sends)) as avg_click_rate,
        SAFE_DIVIDE(SUM(bounces), SUM(sends)) as avg_bounce_rate,
        SAFE_DIVIDE(SUM(unsubscribes), SUM(sends)) as avg_unsubscribe_rate,
        SUM(sends) as total_sends,
        SUM(bounces) as total_bounces,
        SUM(unsubscribes) as total_unsubscribes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_campaigns_detailed\`
      WHERE ${filters.campaignFilter}
    ),
    prev_metrics_data AS (
      SELECT
        SAFE_DIVIDE(SUM(opens), SUM(sends)) as prev_avg_open_rate,
        SAFE_DIVIDE(SUM(clicks), SUM(sends)) as prev_avg_click_rate,
        SAFE_DIVIDE(SUM(bounces), SUM(sends)) as prev_avg_bounce_rate,
        SAFE_DIVIDE(SUM(unsubscribes), SUM(sends)) as prev_avg_unsubscribe_rate,
        SUM(sends) as prev_total_sends,
        SUM(bounces) as prev_total_bounces,
        SUM(unsubscribes) as prev_total_unsubscribes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_campaigns_detailed\`
      WHERE ${comparisonCampaignFilter}
    )
    SELECT * FROM revenue_data, prev_revenue_data, total_shopify_revenue, prev_total_shopify_revenue, metrics_data, prev_metrics_data
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];

    // Helper function to calculate percentage change
    const calcChange = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const totalEmailRevenue = Math.round(row.total_email_revenue_mtd || 0);
    const prevTotalEmailRevenue = Math.round(row.prev_total_email_revenue || 0);
    const campaignRevenue = Math.round(row.campaign_revenue_mtd || 0);
    const prevCampaignRevenue = Math.round(row.prev_campaign_revenue || 0);
    const flowRevenue = Math.round(row.flow_revenue_mtd || 0);
    const prevFlowRevenue = Math.round(row.prev_flow_revenue || 0);

    // Total Shopify revenue for percentage calculations
    const totalRevenue = parseFloat(row.total_revenue || 0);
    const prevTotalRevenue = parseFloat(row.prev_total_revenue || 0);

    // Calculate percentage of total revenue
    const emailPctOfTotal = totalRevenue > 0 ? (totalEmailRevenue / totalRevenue) * 100 : 0;
    const prevEmailPctOfTotal = prevTotalRevenue > 0 ? (prevTotalEmailRevenue / prevTotalRevenue) * 100 : 0;
    const campaignPctOfTotal = totalRevenue > 0 ? (campaignRevenue / totalRevenue) * 100 : 0;
    const prevCampaignPctOfTotal = prevTotalRevenue > 0 ? (prevCampaignRevenue / prevTotalRevenue) * 100 : 0;
    const flowPctOfTotal = totalRevenue > 0 ? (flowRevenue / totalRevenue) * 100 : 0;
    const prevFlowPctOfTotal = prevTotalRevenue > 0 ? (prevFlowRevenue / prevTotalRevenue) * 100 : 0;

    // Calculate percentage point change (not percentage change)
    const emailPctChange = emailPctOfTotal - prevEmailPctOfTotal;
    const campaignPctChange = campaignPctOfTotal - prevCampaignPctOfTotal;
    const flowPctChange = flowPctOfTotal - prevFlowPctOfTotal;

    return {
      totalEmailRevenue,
      prevTotalEmailRevenue,
      totalEmailRevenueChange: calcChange(totalEmailRevenue, prevTotalEmailRevenue),
      emailPctOfTotal,
      prevEmailPctOfTotal,
      emailPctChange,
      campaignRevenue,
      prevCampaignRevenue,
      campaignRevenueChange: calcChange(campaignRevenue, prevCampaignRevenue),
      campaignPctOfTotal,
      prevCampaignPctOfTotal,
      campaignPctChange,
      flowRevenue,
      prevFlowRevenue,
      flowRevenueChange: calcChange(flowRevenue, prevFlowRevenue),
      flowPctOfTotal,
      prevFlowPctOfTotal,
      flowPctChange,
      avgOpenRate: (row.avg_open_rate || 0) * 100,
      prevAvgOpenRate: (row.prev_avg_open_rate || 0) * 100,
      openRateChange: calcChange(row.avg_open_rate || 0, row.prev_avg_open_rate || 0),
      avgClickRate: (row.avg_click_rate || 0) * 100,
      prevAvgClickRate: (row.prev_avg_click_rate || 0) * 100,
      clickRateChange: calcChange(row.avg_click_rate || 0, row.prev_avg_click_rate || 0),
      avgBounceRate: (row.avg_bounce_rate || 0) * 100,
      prevAvgBounceRate: (row.prev_avg_bounce_rate || 0) * 100,
      bounceRateChange: calcChange(row.avg_bounce_rate || 0, row.prev_avg_bounce_rate || 0),
      avgUnsubscribeRate: (row.avg_unsubscribe_rate || 0) * 100,
      prevAvgUnsubscribeRate: (row.prev_avg_unsubscribe_rate || 0) * 100,
      unsubscribeRateChange: calcChange(row.avg_unsubscribe_rate || 0, row.prev_avg_unsubscribe_rate || 0),
      totalSends: row.total_sends || 0,
      prevTotalSends: row.prev_total_sends || 0,
      totalBounces: row.total_bounces || 0,
      totalUnsubscribes: row.total_unsubscribes || 0
    };
  } catch (error) {
    console.error('Error fetching email dashboard data:', error);
    return null;
  }
}

// Get email campaigns table data
export async function getEmailCampaignsTable(preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const { campaignFilter } = getDateFilterSQL(preset, startDate, endDate);

  const query = `
    SELECT
      campaign_name,
      email_subject,
      send_date,
      sends,
      ROUND(open_rate * 100, 2) as open_rate,
      ROUND(click_rate * 100, 2) as click_rate,
      ROUND(bounce_rate * 100, 2) as bounce_rate,
      ROUND(unsubscribe_rate * 100, 2) as unsubscribe_rate,
      attributed_revenue,
      attributed_purchases,
      ROUND(revenue_per_send, 3) as revenue_per_send
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_campaigns_detailed\`
    WHERE ${campaignFilter}
    ORDER BY send_date DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      campaignName: row.campaign_name,
      emailSubject: row.email_subject,
      sendDate: row.send_date.value,
      sends: row.sends,
      openRate: row.open_rate,
      clickRate: row.click_rate,
      bounceRate: row.bounce_rate,
      unsubscribeRate: row.unsubscribe_rate,
      revenue: Math.round(row.attributed_revenue || 0),
      purchases: row.attributed_purchases,
      revenuePerSend: row.revenue_per_send
    }));
  } catch (error) {
    console.error('Error fetching email campaigns table:', error);
    return [];
  }
}

// Get email flows table data
export async function getEmailFlowsTable(preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const { revenueFilter } = getDateFilterSQL(preset, startDate, endDate);

  const query = `
    SELECT
      flow_name,
      flow_category,
      SUM(attributed_revenue) as total_revenue,
      SUM(attributed_purchases) as total_purchases,
      COUNT(DISTINCT purchase_date) as days_active
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_daily_flow_revenue\`
    WHERE ${revenueFilter}
    GROUP BY flow_name, flow_category
    ORDER BY total_revenue DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      flowName: row.flow_name,
      flowCategory: row.flow_category,
      revenue: Math.round(row.total_revenue || 0),
      purchases: row.total_purchases,
      daysActive: row.days_active
    }));
  } catch (error) {
    console.error('Error fetching email flows table:', error);
    return [];
  }
}

// Get product intelligence data
export async function getProductIntelligence(period: string = '30d'): Promise<any[]> {
  const query = `
    SELECT
      product_title,
      units_sold_${period},
      revenue_${period},
      units_sold_prev_${period},
      revenue_prev_${period},
      units_change_pct_${period},
      revenue_change_pct_${period},
      total_inventory_quantity,
      inventory_status,
      performance_category_30d
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.product_intelligence\`
    ORDER BY revenue_${period} DESC
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      productName: row.product_title,
      unitsSold: row[`units_sold_${period}`],
      revenue: Math.round(row[`revenue_${period}`] || 0),
      unitsSoldPrev: row[`units_sold_prev_${period}`],
      revenuePrev: Math.round(row[`revenue_prev_${period}`] || 0),
      unitsChangePct: parseFloat(row[`units_change_pct_${period}`] || 0),
      revenueChangePct: parseFloat(row[`revenue_change_pct_${period}`] || 0),
      inventory: row.total_inventory_quantity,
      performance: row.performance_category_30d,
      status: row.inventory_status
    }));
  } catch (error) {
    console.error('Error fetching product intelligence:', error);
    return [];
  }
}

// Get grip repeat purchase analysis
export async function getGripRepeatPurchaseAnalysis(): Promise<any[]> {
  const query = `
    SELECT
      first_grip_type,
      repeat_purchase_rate_pct,
      loyalty_rate_pct,
      total_customers
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_grip_repeat_purchase_analysis\`
    ORDER BY repeat_purchase_rate_pct DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      gripType: row.first_grip_type,
      repeatRate: parseFloat(row.repeat_purchase_rate_pct || 0),
      loyaltyRate: parseFloat(row.loyalty_rate_pct || 0),
      customerCount: row.total_customers
    }));
  } catch (error) {
    console.error('Error fetching grip repeat purchase analysis:', error);
    return [];
  }
}

// Get product rankings
export async function getProductRankings(): Promise<any[]> {
  const query = `
    SELECT
      product_title,
      variant_title,
      revenue_30d,
      revenue_growth_rate,
      revenue_rank,
      performance_tier,
      trend_status
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.product_rankings\`
    ORDER BY revenue_rank
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      productTitle: row.product_title,
      variantTitle: row.variant_title,
      revenue: parseFloat(row.revenue_30d || 0),
      revenueGrowth: parseFloat(row.revenue_growth_rate || 0),
      revenueRank: row.revenue_rank,
      performanceTier: row.performance_tier,
      trendStatus: row.trend_status
    }));
  } catch (error) {
    console.error('Error fetching product rankings:', error);
    return [];
  }
}

// Get grip switching patterns data
export async function getGripSwitchingPatterns(): Promise<any[]> {
  const query = `
    SELECT
      first_grip_type,
      repeat_grip_type,
      behavior_type,
      total_repeat_orders,
      unique_switching_customers,
      switching_revenue,
      avg_switching_order_value,
      avg_days_between_purchases,
      pct_of_first_grip_repeats,
      pct_of_first_grip_repeat_revenue
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_grip_switching_patterns\`
    ORDER BY total_repeat_orders DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      firstGrip: row.first_grip_type,
      repeatGrip: row.repeat_grip_type,
      behaviorType: row.behavior_type,
      orders: row.total_repeat_orders,
      customers: row.unique_switching_customers,
      revenue: parseFloat(row.switching_revenue || 0),
      avgOrderValue: parseFloat(row.avg_switching_order_value || 0),
      avgDaysBetween: parseFloat(row.avg_days_between_purchases || 0),
      pctOfRepeats: parseFloat(row.pct_of_first_grip_repeats || 0),
      pctOfRevenue: parseFloat(row.pct_of_first_grip_repeat_revenue || 0)
    }));
  } catch (error) {
    console.error('Error fetching grip switching patterns:', error);
    return [];
  }
}

// Get customer CLV and churn data
export async function getCustomerCLVData(): Promise<any> {
  const query = `
    WITH segment_stats AS (
      SELECT
        value_tier,
        COUNT(*) as customer_count,
        AVG(predicted_clv_12m) as avg_clv,
        SUM(CASE WHEN churn_probability_30d >= 0.7 THEN 1 ELSE 0 END) as high_risk_count,
        SUM(CASE WHEN churn_probability_30d >= 0.7 THEN predicted_clv_12m ELSE 0 END) as at_risk_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.clv_prediction_advanced\`
      WHERE value_tier IS NOT NULL
      GROUP BY value_tier
    )
    SELECT
      value_tier,
      customer_count,
      avg_clv,
      high_risk_count,
      at_risk_revenue
    FROM segment_stats
    ORDER BY
      CASE value_tier
        WHEN 'VIP' THEN 1
        WHEN 'High Value' THEN 2
        WHEN 'Medium Value' THEN 3
        WHEN 'Low Value' THEN 4
        ELSE 5
      END
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    const segments = rows.map(row => ({
      tier: row.value_tier,
      customerCount: row.customer_count,
      avgCLV: parseFloat(row.avg_clv || 0),
      highRiskCount: row.high_risk_count,
      atRiskRevenue: parseFloat(row.at_risk_revenue || 0)
    }));

    const totalHighRisk = segments.reduce((sum, s) => sum + s.highRiskCount, 0);
    const totalAtRiskRevenue = segments.reduce((sum, s) => sum + s.atRiskRevenue, 0);

    return {
      segments,
      totalHighRisk,
      totalAtRiskRevenue
    };
  } catch (error) {
    console.error('Error fetching customer CLV data:', error);
    return {
      segments: [],
      totalHighRisk: 0,
      totalAtRiskRevenue: 0
    };
  }
}

// Get platform performance data
export async function getPlatformPerformanceData(period: string = '30d'): Promise<any> {
  const daysMap: { [key: string]: number } = {
    '7d': 7,
    '30d': 30,
    '60d': 60,
    '90d': 90
  };
  const days = daysMap[period] || 30;

  const query = `
    WITH daily_platform_metrics AS (
      SELECT
        platform,
        date,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
      WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
      GROUP BY platform, date
    ),
    platform_aggregates AS (
      SELECT
        platform,
        AVG(CASE WHEN date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN roas END) as roas_7d,
        AVG(roas) as roas_period,
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        COUNT(DISTINCT date) as days_active
      FROM daily_platform_metrics
      GROUP BY platform
    ),
    trend_calc AS (
      SELECT
        platform,
        roas_7d,
        roas_period,
        total_spend,
        total_revenue,
        SAFE_DIVIDE(roas_period - roas_7d, roas_7d) * 100 as trend_pct,
        CASE
          WHEN SAFE_DIVIDE(roas_period - roas_7d, roas_7d) > 0.05 THEN 'Scale'
          WHEN SAFE_DIVIDE(roas_period - roas_7d, roas_7d) < -0.05 THEN 'Optimize'
          ELSE 'Monitor'
        END as action
      FROM platform_aggregates
    )
    SELECT * FROM trend_calc
    ORDER BY roas_period DESC;
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    const platformMetrics = rows.map(row => ({
      platform: row.platform,
      roas7d: parseFloat((row.roas_7d || 0).toFixed(2)),
      roasPeriod: parseFloat((row.roas_period || 0).toFixed(2)),
      trendPct: parseFloat((row.trend_pct || 0).toFixed(1)),
      action: row.action,
      totalSpend: parseFloat(row.total_spend || 0),
      totalRevenue: parseFloat(row.total_revenue || 0)
    }));

    // Get marginal analysis
    const marginalQuery = `
      SELECT
        platform,
        avg_roas,
        avg_marginal_roas,
        action_recommendation,
        current_spend_share_pct,
        optimal_spend_share_pct
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_comprehensive_platform_marginal_analysis\`
      WHERE platform IN ('Facebook', 'Google Ads')
    `;

    const [marginalRows] = await bigquery.query({
      query: marginalQuery,
      timeoutMs: 30000,
    });

    const marginalAnalysis = marginalRows.map(row => ({
      platform: row.platform,
      avgRoas: parseFloat((row.avg_roas || 0).toFixed(2)),
      marginalRoas: parseFloat((row.avg_marginal_roas || 0).toFixed(2)),
      action: row.action_recommendation,
      currentShare: parseFloat((row.current_spend_share_pct || 0).toFixed(1)),
      optimalShare: parseFloat((row.optimal_spend_share_pct || 0).toFixed(1))
    }));

    // Get campaign type analysis
    const campaignTypeQuery = `
      SELECT
        platform,
        avg_daily_spend,
        avg_roas,
        avg_marginal_roas,
        action_recommendation,
        recommended_spend_change,
        projected_30d_impact
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_comprehensive_platform_marginal_analysis\`
      ORDER BY avg_marginal_roas DESC
    `;

    const [campaignRows] = await bigquery.query({
      query: campaignTypeQuery,
      timeoutMs: 30000,
    });

    const campaignTypes = campaignRows.map(row => ({
      type: row.platform,
      avgSpend: parseFloat(row.avg_daily_spend || 0),
      avgRoas: parseFloat((row.avg_roas || 0).toFixed(2)),
      marginalRoas: parseFloat((row.avg_marginal_roas || 0).toFixed(2)),
      action: row.action_recommendation,
      spendChange: parseFloat(row.recommended_spend_change || 0),
      projectedImpact: parseFloat(row.projected_30d_impact || 0)
    }));

    return {
      platformMetrics,
      marginalAnalysis,
      campaignTypes
    };
  } catch (error) {
    console.error('Error fetching platform performance data:', error);
    throw error;
  }
}

// Helper function to generate date filter SQL for paid media
function getPaidMediaDateFilterSQL(preset: string, startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): {
  dateFilter: string,
  prevDateFilter: string,
  prevYearDateFilter: string,
  daysDiff: number
} {
  const yesterday = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';

  switch (preset) {
    case 'yesterday':
      return {
        dateFilter: `date = ${yesterday}`,
        prevDateFilter: `date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)`,
        prevYearDateFilter: `date = DATE_SUB(${yesterday}, INTERVAL 1 YEAR)`,
        daysDiff: 1
      };
    case 'last7':
      return {
        dateFilter: `date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND date < CURRENT_DATE()`,
        prevDateFilter: `date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
        prevYearDateFilter: `date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), INTERVAL 1 YEAR) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        daysDiff: 7
      };
    case 'ytd':
      const ytdNow = new Date();
      const ytdYearStart = new Date(ytdNow.getFullYear(), 0, 1);
      const ytdDays = Math.ceil((ytdNow.getTime() - ytdYearStart.getTime()) / (1000 * 60 * 60 * 24));
      return {
        dateFilter: `date >= DATE_TRUNC(CURRENT_DATE(), YEAR) AND date < CURRENT_DATE()`,
        prevDateFilter: `date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL ${ytdDays} DAY) AND date < DATE_TRUNC(CURRENT_DATE(), YEAR)`,
        prevYearDateFilter: `date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), YEAR), INTERVAL 1 YEAR) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        daysDiff: ytdDays
      };
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Start and end dates required for custom range');
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return {
        dateFilter: `date >= '${startDate}' AND date <= '${endDate}'`,
        prevDateFilter: `date >= DATE_SUB('${startDate}', INTERVAL ${diffDays} DAY) AND date < '${startDate}'`,
        prevYearDateFilter: `date >= DATE_SUB('${startDate}', INTERVAL 1 YEAR) AND date <= DATE_SUB('${endDate}', INTERVAL 1 YEAR)`,
        daysDiff: diffDays
      };
    case 'mtd':
    default:
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mtdDays = Math.ceil((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      return {
        dateFilter: `date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND date < CURRENT_DATE()`,
        prevDateFilter: `date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)`,
        prevYearDateFilter: `date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 YEAR) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)`,
        daysDiff: mtdDays
      };
  }
}

// Get Facebook performance data with KPIs and time series
export async function getFacebookPerformanceData(preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any> {
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, comparisonType);
  const comparisonDateFilter = comparisonType === 'previous-year' ? filters.prevYearDateFilter : filters.prevDateFilter;

  const query = `
    WITH current_period AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100 as ctr,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${filters.dateFilter}
    ),
    comparison_period AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${comparisonDateFilter}
    ),
    current_daily AS (
      SELECT
        date,
        SUM(revenue) as revenue_current
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${filters.dateFilter}
      GROUP BY date
    ),
    comparison_daily AS (
      SELECT
        ${comparisonType === 'previous-year' ? 'DATE_ADD(date, INTERVAL 1 YEAR)' : `DATE_ADD(date, INTERVAL ${filters.daysDiff} DAY)`} as date,
        SUM(revenue) as revenue_comparison
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${comparisonDateFilter}
      GROUP BY date
    ),
    daily_metrics AS (
      SELECT
        cd.date,
        cd.revenue_current,
        COALESCE(cpd.revenue_comparison, 0) as revenue_comparison
      FROM current_daily cd
      LEFT JOIN comparison_daily cpd ON cd.date = cpd.date
      ORDER BY cd.date
    )
    SELECT
      (SELECT total_spend FROM current_period) as spend,
      (SELECT total_revenue FROM current_period) as revenue,
      (SELECT roas FROM current_period) as roas,
      (SELECT total_impressions FROM current_period) as impressions,
      (SELECT total_clicks FROM current_period) as clicks,
      (SELECT ctr FROM current_period) as ctr,
      (SELECT total_purchases FROM current_period) as purchases,
      (SELECT total_spend FROM comparison_period) as prev_spend,
      (SELECT total_revenue FROM comparison_period) as prev_revenue,
      (SELECT roas FROM comparison_period) as prev_roas,
      (SELECT total_impressions FROM comparison_period) as prev_impressions,
      (SELECT total_clicks FROM comparison_period) as prev_clicks,
      (SELECT total_purchases FROM comparison_period) as prev_purchases,
      ARRAY_AGG(STRUCT(date, revenue_current, revenue_comparison) ORDER BY date) as daily_metrics
    FROM daily_metrics
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      spend: {
        current: parseFloat(row.spend || 0),
        previous: parseFloat(row.prev_spend || 0),
        change: row.prev_spend ? ((row.spend - row.prev_spend) / row.prev_spend) * 100 : 0
      },
      revenue: {
        current: parseFloat(row.revenue || 0),
        previous: parseFloat(row.prev_revenue || 0),
        change: row.prev_revenue ? ((row.revenue - row.prev_revenue) / row.prev_revenue) * 100 : 0
      },
      roas: {
        current: parseFloat((row.roas || 0).toFixed(2)),
        previous: parseFloat((row.prev_roas || 0).toFixed(2)),
        change: row.prev_roas ? ((row.roas - row.prev_roas) / row.prev_roas) * 100 : 0
      },
      impressions: {
        current: parseInt(row.impressions || 0),
        previous: parseInt(row.prev_impressions || 0),
        change: row.prev_impressions ? ((row.impressions - row.prev_impressions) / row.prev_impressions) * 100 : 0
      },
      clicks: {
        current: parseInt(row.clicks || 0),
        previous: parseInt(row.prev_clicks || 0),
        change: row.prev_clicks ? ((row.clicks - row.prev_clicks) / row.prev_clicks) * 100 : 0
      },
      purchases: {
        current: parseInt(row.purchases || 0),
        previous: parseInt(row.prev_purchases || 0),
        change: row.prev_purchases ? ((row.purchases - row.prev_purchases) / row.prev_purchases) * 100 : 0
      },
      ctr: parseFloat((row.ctr || 0).toFixed(2)),
      dailyMetrics: row.daily_metrics.map((d: any) => ({
        date: d.date.value,
        revenue_cy: Math.round(parseFloat(d.revenue_current || 0)),
        revenue_ly: Math.round(parseFloat(d.revenue_comparison || 0))
      }))
    };
  } catch (error) {
    console.error('Error fetching Facebook performance data:', error);
    throw error;
  }
}

// Get product affinity data
export async function getProductAffinity(): Promise<any[]> {
  const query = `
    SELECT
      product_a_title,
      product_b_title,
      co_purchase_count,
      bundle_price,
      affinity_rank_for_product_a,
      overall_affinity_rank
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.product_affinity\`
    ORDER BY co_purchase_count DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      productA: row.product_a_title,
      productB: row.product_b_title,
      coPurchaseCount: row.co_purchase_count,
      bundlePrice: parseFloat(row.bundle_price || 0),
      affinityRank: row.affinity_rank_for_product_a,
      overallRank: row.overall_affinity_rank
    }));
  } catch (error) {
    console.error('Error fetching product affinity:', error);
    return [];
  }
}

// Get geographic product performance
export async function getGeographicProductPerformance(): Promise<any[]> {
  const query = `
    WITH state_totals AS (
      SELECT
        state_province,
        SUM(revenue_30d) as total_revenue,
        SUM(units_sold_30d) as total_units
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.geographic_product_performance\`
      WHERE state_province IS NOT NULL AND country_code = 'US'
      GROUP BY state_province
    ),
    state_top_products AS (
      SELECT
        state_province,
        product_title,
        SUM(revenue_30d) as product_revenue,
        ROW_NUMBER() OVER (PARTITION BY state_province ORDER BY SUM(revenue_30d) DESC) as rn
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.geographic_product_performance\`
      WHERE state_province IS NOT NULL AND country_code = 'US'
      GROUP BY state_province, product_title
    )
    SELECT
      st.state_province,
      st.total_revenue,
      st.total_units,
      stp.product_title as top_product,
      stp.product_revenue as top_product_revenue
    FROM state_totals st
    LEFT JOIN state_top_products stp ON st.state_province = stp.state_province AND stp.rn = 1
    ORDER BY st.total_revenue DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      state: row.state_province,
      revenue: Math.round(row.total_revenue || 0),
      units: row.total_units,
      topProduct: row.top_product,
      topProductRevenue: Math.round(row.top_product_revenue || 0)
    }));
  } catch (error) {
    console.error('Error fetching geographic product performance:', error);
    return [];
  }
}

// Get Shopify revenue YoY comparison for dashboard
export async function getShopifyRevenueYoY(): Promise<any[]> {
  const query = `
    WITH current_period AS (
      SELECT
        date,
        revenue,
        orders
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.daily_business_metrics\`
      WHERE date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        AND date < CURRENT_DATE()
    ),
    previous_year AS (
      SELECT
        DATE_ADD(date, INTERVAL 1 YEAR) as date,
        revenue as revenue_ly,
        orders as orders_ly
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.daily_business_metrics\`
      WHERE date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 YEAR)
        AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)
    )
    SELECT
      cp.date,
      cp.revenue as revenue_cy,
      cp.orders as orders_cy,
      py.revenue_ly,
      py.orders_ly
    FROM current_period cp
    LEFT JOIN previous_year py ON cp.date = py.date
    ORDER BY cp.date ASC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      date: row.date.value,
      revenue_cy: Math.round(parseFloat(row.revenue_cy) || 0),
      revenue_ly: Math.round(parseFloat(row.revenue_ly) || 0),
      orders_cy: row.orders_cy || 0,
      orders_ly: row.orders_ly || 0
    }));
  } catch (error) {
    console.error('Error fetching Shopify revenue YoY:', error);
    throw error;
  }
}

// Get client dashboard configuration
export async function getClientDashboardConfig(): Promise<any> {
  const clientId = process.env.CURRENT_CLIENT_ID || 'jumbomax';
  const query = `
    SELECT dashboard_config
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.admin_configs.client_configurations\`
    WHERE id = @client_id
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { client_id: clientId },
      timeoutMs: 30000,
    });

    if (rows.length > 0 && rows[0].dashboard_config) {
      return JSON.parse(rows[0].dashboard_config);
    }
    return null;
  } catch (error) {
    console.error('Error fetching client dashboard config:', error);
    return null;
  }
}

// Get executive summary data for dashboard
export async function getExecutiveSummary(): Promise<ExecutiveSummary | null> {
  const query = `
    SELECT
      revenue_mtd,
      revenue_mtd_yoy_growth_pct,
      revenue_7d,
      revenue_7d_yoy_growth_pct,
      revenue_30d,
      revenue_30d_yoy_growth_pct,
      blended_roas_mtd,
      blended_roas_mtd_yoy_growth_pct,
      blended_roas_7d,
      blended_roas_7d_yoy_growth_pct,
      blended_roas_30d,
      blended_roas_30d_yoy_growth_pct,
      blended_spend_mtd,
      blended_spend_7d,
      blended_spend_30d,
      blended_spend_mtd_yoy,
      blended_spend_7d_yoy,
      blended_spend_30d_yoy,
      SAFE_DIVIDE((blended_spend_mtd - blended_spend_mtd_yoy), blended_spend_mtd_yoy) * 100 as blended_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((blended_spend_7d - blended_spend_7d_yoy), blended_spend_7d_yoy) * 100 as blended_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((blended_spend_30d - blended_spend_30d_yoy), blended_spend_30d_yoy) * 100 as blended_spend_30d_yoy_growth_pct,
      klaviyo_total_revenue_mtd,
      klaviyo_total_revenue_7d,
      klaviyo_total_revenue_30d,
      klaviyo_total_revenue_mtd_yoy_growth_pct,
      klaviyo_total_revenue_7d_yoy_growth_pct,
      klaviyo_total_revenue_30d_yoy_growth_pct,
      klaviyo_revenue_per_send_mtd,
      klaviyo_revenue_per_send_7d,
      klaviyo_revenue_per_send_30d,
      google_spend_mtd,
      google_spend_7d,
      google_spend_30d,
      google_revenue_mtd,
      google_revenue_7d,
      google_revenue_30d,
      google_roas_mtd,
      google_roas_7d,
      google_roas_30d,
      google_roas_mtd_yoy_growth_pct,
      google_roas_7d_yoy_growth_pct,
      google_roas_30d_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_mtd - google_spend_mtd_yoy), google_spend_mtd_yoy) * 100 as google_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_7d - google_spend_7d_yoy), google_spend_7d_yoy) * 100 as google_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_30d - google_spend_30d_yoy), google_spend_30d_yoy) * 100 as google_spend_30d_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_mtd - google_revenue_mtd_yoy), google_revenue_mtd_yoy) * 100 as google_revenue_mtd_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_7d - google_revenue_7d_yoy), google_revenue_7d_yoy) * 100 as google_revenue_7d_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_30d - google_revenue_30d_yoy), google_revenue_30d_yoy) * 100 as google_revenue_30d_yoy_growth_pct,
      facebook_spend_mtd,
      facebook_spend_7d,
      facebook_spend_30d,
      facebook_revenue_mtd,
      facebook_revenue_7d,
      facebook_revenue_30d,
      facebook_roas_mtd,
      facebook_roas_7d,
      facebook_roas_30d,
      facebook_roas_mtd_yoy_growth_pct,
      facebook_roas_7d_yoy_growth_pct,
      facebook_roas_30d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_mtd - facebook_spend_mtd_yoy), facebook_spend_mtd_yoy) * 100 as facebook_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_7d - facebook_spend_7d_yoy), facebook_spend_7d_yoy) * 100 as facebook_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_30d - facebook_spend_30d_yoy), facebook_spend_30d_yoy) * 100 as facebook_spend_30d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_mtd - facebook_revenue_mtd_yoy), facebook_revenue_mtd_yoy) * 100 as facebook_revenue_mtd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_7d - facebook_revenue_7d_yoy), facebook_revenue_7d_yoy) * 100 as facebook_revenue_7d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_30d - facebook_revenue_30d_yoy), facebook_revenue_30d_yoy) * 100 as facebook_revenue_30d_yoy_growth_pct
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.ai_executive_summary\`
    ORDER BY report_date DESC
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.length > 0 ? (rows[0] as ExecutiveSummary) : null;
  } catch (error) {
    console.error('Error fetching executive summary:', error);
    throw error;
  }
}