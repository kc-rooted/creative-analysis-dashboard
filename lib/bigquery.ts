import { BigQuery } from '@google-cloud/bigquery';
import { getClientConfig, CLIENT_CONFIGS } from './client-config';

// Initialize BigQuery client (same for all clients)
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

// Pure function: get dataset name for a specific client
// This is the new preferred approach - always pass clientId explicitly
function getDatasetName(clientId: string): string {
  if (!clientId) {
    throw new Error('[getDatasetName] clientId is required');
  }
  const clientConfig = getClientConfig(clientId);
  return clientConfig.bigquery.dataset;
}

// Helper to build table reference with explicit client ID
function getTableReference(tableName: string, clientId: string): string {
  const datasetName = getDatasetName(clientId);
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
  clientId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0,
  sortBy: 'priority' | 'date' | 'usage' | 'roas' | 'analyzed' = 'roas'
): Promise<Creative[]> {
  const datasetName = getDatasetName(clientId);
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
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\` ca
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

export async function getAnalysisStatistics(clientId: string): Promise<AnalysisStats[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      'pending' as analysis_status,
      COUNT(DISTINCT cpd.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\` ca
      ON cpd.content_id = ca.content_id
    WHERE cpd.creative_type != 'NO_VISUAL'
      AND cpd.video_id IS NULL
      AND (ca.content_id IS NULL OR ca.analysis_status IS NULL OR ca.analysis_status = 'pending')

    UNION ALL

    SELECT
      ca.analysis_status,
      COUNT(DISTINCT ca.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\` ca
    JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_performance_dashboard\` cpd
      ON ca.content_id = cpd.content_id
    WHERE cpd.creative_type != 'NO_VISUAL'
      AND cpd.video_id IS NULL
      AND ca.analysis_status IS NOT NULL AND ca.analysis_status != 'pending'
    GROUP BY ca.analysis_status
  `;

  const [rows] = await bigquery.query(query);
  return rows as AnalysisStats[];
}

export async function getCampaignUsage(clientId: string, imageUrl: string): Promise<CampaignUsage[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      creative_id,
      creative_name,
      platform,
      ad_text,
      ad_title,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', last_updated) as last_updated
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.unified_creative_inventory\`
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
  clientId: string,
  creativeId: string,
  status: 'analyzing' | 'completed' | 'failed',
  analysisData?: any
) {
  const datasetName = getDatasetName(clientId);
  const table = bigquery.dataset(datasetName).table('creative_analysis');

  const row = {
    creative_id: creativeId,
    analysis_status: status,
    analysis_timestamp: new Date().toISOString(),
    ...(analysisData || {}),
  };

  await table.insert([row]);
}

export async function triggerAnalysis(clientId: string, contentIds: string[]): Promise<void> {
  // Mark creatives for analysis
  for (const contentId of contentIds) {
    await updateAnalysisStatus(clientId, contentId, 'analyzing');
  }
}

export async function updateCreativeTags(
  clientId: string,
  contentId: string,
  tags: string[]
): Promise<void> {
  const datasetName = getDatasetName(clientId);
  const query = `
    UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\`
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
export async function getPaidMediaTrend(clientId: string, days: number = 30): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      date,
      SUM(revenue) as revenue,
      SUM(spend) as spend,
      SUM(purchases) as orders,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
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
export async function getRevenueForecast7Day(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      SUM(forecasted_revenue) as total_forecasted_revenue,
      SUM(lower_bound) as total_lower_bound,
      SUM(upper_bound) as total_upper_bound,
      SUM(suggested_spend) as total_suggested_spend,
      AVG(expected_roas) as avg_expected_roas,
      COUNT(*) as forecast_days
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_comprehensive_revenue_forecast_7day\`
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
export async function getEmailDashboardData(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any> {
  const datasetName = getDatasetName(clientId);
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_daily_unified_attribution\`
      WHERE ${filters.revenueFilter}
    ),
    prev_revenue_data AS (
      SELECT
        SUM(CASE WHEN attributed_email_type = 'Campaign' THEN attributed_revenue ELSE 0 END) as prev_campaign_revenue,
        SUM(CASE WHEN attributed_email_type = 'Flow' THEN attributed_revenue ELSE 0 END) as prev_flow_revenue,
        SUM(attributed_revenue) as prev_total_email_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_daily_unified_attribution\`
      WHERE ${comparisonRevenueFilter}
    ),
    total_shopify_revenue AS (
      SELECT
        SUM(revenue) as total_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.daily_business_metrics\`
      WHERE ${filters.revenueFilter.replace(/purchase_date/g, 'date')}
    ),
    prev_total_shopify_revenue AS (
      SELECT
        SUM(revenue) as prev_total_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.daily_business_metrics\`
      WHERE ${comparisonRevenueFilter.replace(/purchase_date/g, 'date')}
    ),
    metrics_data AS (
      SELECT
        -- Use unique opens/deliveries for accurate open rates
        SAFE_DIVIDE(SUM(unique_opens), SUM(deliveries)) as avg_open_rate,
        SAFE_DIVIDE(SUM(human_opens), SUM(deliveries)) as avg_human_open_rate,
        SAFE_DIVIDE(SUM(unique_clicks), SUM(deliveries)) as avg_click_rate,
        SAFE_DIVIDE(SUM(bounces), SUM(sends)) as avg_bounce_rate,
        SAFE_DIVIDE(SUM(unsubscribes), SUM(deliveries)) as avg_unsubscribe_rate,
        SUM(sends) as total_sends,
        SUM(deliveries) as total_deliveries,
        SUM(bounces) as total_bounces,
        SUM(unsubscribes) as total_unsubscribes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_campaigns_detailed\`
      WHERE ${filters.campaignFilter}
    ),
    prev_metrics_data AS (
      SELECT
        SAFE_DIVIDE(SUM(unique_opens), SUM(deliveries)) as prev_avg_open_rate,
        SAFE_DIVIDE(SUM(human_opens), SUM(deliveries)) as prev_avg_human_open_rate,
        SAFE_DIVIDE(SUM(unique_clicks), SUM(deliveries)) as prev_avg_click_rate,
        SAFE_DIVIDE(SUM(bounces), SUM(sends)) as prev_avg_bounce_rate,
        SAFE_DIVIDE(SUM(unsubscribes), SUM(deliveries)) as prev_avg_unsubscribe_rate,
        SUM(sends) as prev_total_sends,
        SUM(deliveries) as prev_total_deliveries,
        SUM(bounces) as prev_total_bounces,
        SUM(unsubscribes) as prev_total_unsubscribes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_campaigns_detailed\`
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
      avgHumanOpenRate: (row.avg_human_open_rate || 0) * 100,
      prevAvgHumanOpenRate: (row.prev_avg_human_open_rate || 0) * 100,
      humanOpenRateChange: calcChange(row.avg_human_open_rate || 0, row.prev_avg_human_open_rate || 0),
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
      totalDeliveries: row.total_deliveries || 0,
      prevTotalDeliveries: row.prev_total_deliveries || 0,
      totalBounces: row.total_bounces || 0,
      totalUnsubscribes: row.total_unsubscribes || 0
    };
  } catch (error) {
    console.error('Error fetching email dashboard data:', error);
    return null;
  }
}

// Get email campaigns table data
export async function getEmailCampaignsTable(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const { campaignFilter } = getDateFilterSQL(preset, startDate, endDate);

  const query = `
    SELECT
      campaign_name,
      email_subject,
      send_date,
      sends,
      ROUND(open_rate * 100, 2) as open_rate,
      ROUND(unique_click_rate * 100, 2) as unique_click_rate,
      ROUND(click_to_open_rate * 100, 2) as click_to_open_rate,
      ROUND(bounce_rate * 100, 2) as bounce_rate,
      ROUND(unsubscribe_rate * 100, 2) as unsubscribe_rate,
      attributed_revenue,
      attributed_purchases,
      ROUND(revenue_per_send, 3) as revenue_per_send
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_campaigns_detailed\`
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
      uniqueClickRate: row.unique_click_rate,
      clickToOpenRate: row.click_to_open_rate,
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
export async function getEmailFlowsTable(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const { revenueFilter } = getDateFilterSQL(preset, startDate, endDate);

  const query = `
    SELECT
      flow_name,
      flow_category,
      SUM(attributed_revenue) as total_revenue,
      SUM(attributed_purchases) as total_purchases,
      COUNT(DISTINCT purchase_date) as days_active
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.klaviyo_daily_flow_revenue\`
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
export async function getProductIntelligence(clientId: string, period: string = '30d'): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      product_title,
      units_sold_30d,
      revenue_30d,
      growth_pct_30d,
      revenue_contribution_pct,
      total_inventory_quantity,
      inventory_status,
      smart_performance_category,
      composite_performance_score,
      product_lifecycle_stage
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.product_performance_score\`
    ORDER BY revenue_30d DESC
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      productName: row.product_title,
      unitsSold: row.units_sold_30d,
      revenue: Math.round(row.revenue_30d || 0),
      unitsChangePct: parseFloat(row.growth_pct_30d || 0),
      revenueChangePct: parseFloat(row.growth_pct_30d || 0),
      revenueContribution: parseFloat(row.revenue_contribution_pct || 0),
      inventory: row.total_inventory_quantity,
      performance: row.smart_performance_category,
      performanceScore: parseFloat(row.composite_performance_score || 0),
      lifecycle: row.product_lifecycle_stage,
      status: row.inventory_status
    }));
  } catch (error) {
    console.error('Error fetching product intelligence:', error);
    return [];
  }
}

// Get grip repeat purchase analysis
export async function getGripRepeatPurchaseAnalysis(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      first_grip_type,
      repeat_purchase_rate_pct,
      loyalty_rate_pct,
      total_customers
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_grip_repeat_purchase_analysis\`
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
export async function getProductRankings(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      product_title,
      variant_title,
      revenue_30d,
      revenue_growth_rate,
      revenue_rank,
      performance_tier,
      trend_status
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.product_rankings\`
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
export async function getGripSwitchingPatterns(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
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
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_grip_switching_patterns\`
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

// Get putter grip switching patterns data
export async function getPutterGripSwitchingPatterns(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
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
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_putter_grip_switching_patterns\`
    ORDER BY pct_of_first_grip_repeats DESC
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
    console.error('Error fetching putter grip switching patterns:', error);
    return [];
  }
}

// Get customer CLV and churn data
export async function getCustomerCLVData(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    WITH segment_stats AS (
      SELECT
        value_tier,
        COUNT(*) as customer_count,
        AVG(predicted_clv_12m) as avg_clv,
        SUM(CASE WHEN churn_probability_30d >= 0.7 THEN 1 ELSE 0 END) as high_risk_count,
        SUM(CASE WHEN churn_probability_30d >= 0.7 THEN predicted_clv_12m ELSE 0 END) as at_risk_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.clv_prediction_advanced\`
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

// Get customer overview KPIs
export async function getCustomerOverviewKPIs(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    WITH current_metrics AS (
      SELECT
        COUNT(DISTINCT customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN total_orders = 1 THEN customer_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN total_orders > 1 THEN customer_id END) as returning_customers,
        ROUND(AVG(lifetime_value), 2) as avg_ltv,
        ROUND(AVG(average_order_value), 2) as avg_aov,
        ROUND(SUM(lifetime_value), 2) as total_customer_revenue,
        COUNT(DISTINCT CASE WHEN days_since_last_order <= 30 THEN customer_id END) as active_30d,
        COUNT(DISTINCT CASE WHEN days_since_last_order <= 90 THEN customer_id END) as active_90d
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.shopify_customer_360\`
      WHERE customer_id IS NOT NULL
    ),
    churn_metrics AS (
      SELECT
        AVG(churn_probability_30d) as avg_churn_probability,
        COUNT(CASE WHEN churn_probability_30d >= 0.7 THEN 1 END) as high_risk_customers
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.clv_prediction_advanced\`
    )
    SELECT
      cm.*,
      COALESCE(ch.avg_churn_probability, 0) as avg_churn_probability,
      COALESCE(ch.high_risk_customers, 0) as high_risk_customers
    FROM current_metrics cm
    CROSS JOIN churn_metrics ch
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) {
      return {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        avgLTV: 0,
        avgAOV: 0,
        totalRevenue: 0,
        active30d: 0,
        active90d: 0,
        avgChurnProbability: 0,
        highRiskCustomers: 0
      };
    }

    const row = rows[0];
    return {
      totalCustomers: parseInt(row.total_customers || 0),
      newCustomers: parseInt(row.new_customers || 0),
      returningCustomers: parseInt(row.returning_customers || 0),
      avgLTV: parseFloat(row.avg_ltv || 0),
      avgAOV: parseFloat(row.avg_aov || 0),
      totalRevenue: parseFloat(row.total_customer_revenue || 0),
      active30d: parseInt(row.active_30d || 0),
      active90d: parseInt(row.active_90d || 0),
      avgChurnProbability: parseFloat(row.avg_churn_probability || 0),
      highRiskCustomers: parseInt(row.high_risk_customers || 0),
      newVsReturningRatio: row.total_customers > 0 ? (parseInt(row.returning_customers || 0) / parseInt(row.total_customers || 1)) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching customer overview KPIs:', error);
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      avgLTV: 0,
      avgAOV: 0,
      totalRevenue: 0,
      active30d: 0,
      active90d: 0,
      avgChurnProbability: 0,
      highRiskCustomers: 0,
      newVsReturningRatio: 0
    };
  }
}

// Get LTV intelligence data
export async function getLTVIntelligence(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    WITH ltv_distribution AS (
      SELECT
        cp.value_tier,
        COUNT(*) as customer_count,
        ROUND(AVG(sc.lifetime_value), 2) as avg_ltv,
        ROUND(MIN(sc.lifetime_value), 2) as min_ltv,
        ROUND(MAX(sc.lifetime_value), 2) as max_ltv,
        ROUND(SUM(sc.lifetime_value), 2) as total_ltv
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.clv_prediction_advanced\` cp
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.shopify_customer_360\` sc
        ON cp.unified_email = sc.email
      WHERE cp.value_tier IS NOT NULL
      GROUP BY cp.value_tier
    ),
    geographic_ltv AS (
      SELECT
        country,
        COUNT(*) as customer_count,
        ROUND(AVG(lifetime_value), 2) as avg_ltv,
        ROUND(SUM(lifetime_value), 2) as total_revenue
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.shopify_customer_360\`
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country
      HAVING customer_count >= 10
      ORDER BY total_revenue DESC
      LIMIT 15
    ),
    predicted_vs_actual AS (
      SELECT
        cp.value_tier,
        COUNT(*) as customer_count,
        ROUND(AVG(cp.predicted_clv_12m), 2) as avg_predicted_clv,
        ROUND(AVG(sc.lifetime_value), 2) as avg_actual_ltv
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.clv_prediction_advanced\` cp
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.shopify_customer_360\` sc
        ON cp.unified_email = sc.email
      WHERE cp.value_tier IS NOT NULL
      GROUP BY cp.value_tier
    )
    SELECT
      (SELECT ARRAY_AGG(STRUCT(value_tier, customer_count, avg_ltv, min_ltv, max_ltv, total_ltv) ORDER BY
        CASE value_tier
          WHEN 'VIP' THEN 1
          WHEN 'High Value' THEN 2
          WHEN 'Medium Value' THEN 3
          WHEN 'Low Value' THEN 4
          ELSE 5
        END) FROM ltv_distribution) as ltv_by_tier,
      (SELECT ARRAY_AGG(STRUCT(country, customer_count, avg_ltv, total_revenue) ORDER BY total_revenue DESC) FROM geographic_ltv) as ltv_by_country,
      (SELECT ARRAY_AGG(STRUCT(value_tier, customer_count, avg_predicted_clv, avg_actual_ltv) ORDER BY
        CASE value_tier
          WHEN 'VIP' THEN 1
          WHEN 'High Value' THEN 2
          WHEN 'Medium Value' THEN 3
          WHEN 'Low Value' THEN 4
          ELSE 5
        END) FROM predicted_vs_actual) as predicted_vs_actual
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) {
      return {
        ltvByTier: [],
        ltvByCountry: [],
        predictedVsActual: []
      };
    }

    const row = rows[0];
    return {
      ltvByTier: row.ltv_by_tier || [],
      ltvByCountry: row.ltv_by_country || [],
      predictedVsActual: row.predicted_vs_actual || []
    };
  } catch (error) {
    console.error('Error fetching LTV intelligence:', error);
    return {
      ltvByTier: [],
      ltvByCountry: [],
      predictedVsActual: []
    };
  }
}

// Get customer journey analysis
export async function getCustomerJourneyAnalysis(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      journey_pattern,
      customer_count,
      avg_touchpoints,
      avg_days_to_purchase,
      conversion_rate,
      total_revenue,
      avg_order_value,
      first_touch_channel,
      last_touch_channel
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.customer_journey_path_analysis\`
    ORDER BY customer_count DESC
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      journeyPattern: row.journey_pattern,
      customerCount: parseInt(row.customer_count || 0),
      avgTouchpoints: parseFloat(row.avg_touchpoints || 0),
      avgDaysToPurchase: parseFloat(row.avg_days_to_purchase || 0),
      conversionRate: parseFloat(row.conversion_rate || 0),
      totalRevenue: parseFloat(row.total_revenue || 0),
      avgOrderValue: parseFloat(row.avg_order_value || 0),
      firstTouchChannel: row.first_touch_channel,
      lastTouchChannel: row.last_touch_channel
    }));
  } catch (error) {
    console.error('Error fetching customer journey analysis:', error);
    return [];
  }
}

// Get platform performance data
export async function getPlatformPerformanceData(clientId: string, period: string = '30d'): Promise<any> {
  const datasetName = getDatasetName(clientId);
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_comprehensive_platform_marginal_analysis\`
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_comprehensive_platform_marginal_analysis\`
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
export async function getFacebookPerformanceData(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, comparisonType);
  const comparisonDateFilter = comparisonType === 'previous-year' ? filters.prevYearDateFilter : filters.prevDateFilter;

  // Define trailing comparison filters based on comparison type
  const trailing7dComparisonFilter = comparisonType === 'previous-year'
    ? 'date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR), INTERVAL 7 DAY) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)'
    : 'date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)';

  const trailing30dComparisonFilter = comparisonType === 'previous-year'
    ? 'date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR), INTERVAL 30 DAY) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)'
    : 'date >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY) AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)';

  console.log('[Facebook Query] Filters:', {
    preset,
    comparisonType,
    dateFilter: filters.dateFilter,
    comparisonDateFilter,
    daysDiff: filters.daysDiff
  });

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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${comparisonDateFilter}
    ),
    current_daily AS (
      SELECT
        date,
        SUM(revenue) as revenue_current,
        SUM(spend) as spend_current
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook' AND ${filters.dateFilter}
      GROUP BY date
    ),
    comparison_daily AS (
      SELECT
        date,
        0 as revenue_comparison,
        0 as spend_comparison
      FROM current_daily
      WHERE 1=0
    ),
    daily_metrics AS (
      SELECT
        cd.date,
        cd.revenue_current,
        COALESCE(cpd.revenue_comparison, 0) as revenue_comparison,
        cd.spend_current,
        COALESCE(cpd.spend_comparison, 0) as spend_comparison,
        SAFE_DIVIDE(cd.revenue_current, cd.spend_current) as roas_current,
        SAFE_DIVIDE(COALESCE(cpd.revenue_comparison, 0), COALESCE(cpd.spend_comparison, 0)) as roas_comparison
      FROM current_daily cd
      LEFT JOIN comparison_daily cpd ON cd.date = cpd.date
      ORDER BY cd.date
    ),
    trailing_7d AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook'
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        AND date < CURRENT_DATE()
    ),
    trailing_7d_comparison AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook'
        AND ${trailing7dComparisonFilter}
    ),
    trailing_30d AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook'
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        AND date < CURRENT_DATE()
    ),
    trailing_30d_comparison AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Facebook'
        AND ${trailing30dComparisonFilter}
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
      (SELECT total_spend FROM trailing_7d) as trailing_7d_spend,
      (SELECT total_revenue FROM trailing_7d) as trailing_7d_revenue,
      (SELECT roas FROM trailing_7d) as trailing_7d_roas,
      (SELECT total_impressions FROM trailing_7d) as trailing_7d_impressions,
      (SELECT total_clicks FROM trailing_7d) as trailing_7d_clicks,
      (SELECT total_purchases FROM trailing_7d) as trailing_7d_purchases,
      (SELECT total_spend FROM trailing_7d_comparison) as trailing_7d_prev_spend,
      (SELECT total_revenue FROM trailing_7d_comparison) as trailing_7d_prev_revenue,
      (SELECT roas FROM trailing_7d_comparison) as trailing_7d_prev_roas,
      (SELECT total_impressions FROM trailing_7d_comparison) as trailing_7d_prev_impressions,
      (SELECT total_clicks FROM trailing_7d_comparison) as trailing_7d_prev_clicks,
      (SELECT total_purchases FROM trailing_7d_comparison) as trailing_7d_prev_purchases,
      (SELECT total_spend FROM trailing_30d) as trailing_30d_spend,
      (SELECT total_revenue FROM trailing_30d) as trailing_30d_revenue,
      (SELECT roas FROM trailing_30d) as trailing_30d_roas,
      (SELECT total_impressions FROM trailing_30d) as trailing_30d_impressions,
      (SELECT total_clicks FROM trailing_30d) as trailing_30d_clicks,
      (SELECT total_purchases FROM trailing_30d) as trailing_30d_purchases,
      (SELECT total_spend FROM trailing_30d_comparison) as trailing_30d_prev_spend,
      (SELECT total_revenue FROM trailing_30d_comparison) as trailing_30d_prev_revenue,
      (SELECT roas FROM trailing_30d_comparison) as trailing_30d_prev_roas,
      (SELECT total_impressions FROM trailing_30d_comparison) as trailing_30d_prev_impressions,
      (SELECT total_clicks FROM trailing_30d_comparison) as trailing_30d_prev_clicks,
      (SELECT total_purchases FROM trailing_30d_comparison) as trailing_30d_prev_purchases,
      ARRAY_AGG(STRUCT(date, revenue_current, revenue_comparison, spend_current, spend_comparison, roas_current, roas_comparison) ORDER BY date) as daily_metrics
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
    console.log("[Facebook Query] Results:", {
      spend: row.spend,
      prev_spend: row.prev_spend,
      revenue: row.revenue,
      prev_revenue: row.prev_revenue,
      roas: row.roas,
      impressions: row.impressions,
      clicks: row.clicks,
      purchases: row.purchases,
      dailyMetricsCount: row.daily_metrics?.length
    });

    // Calculate current period efficiency metrics
    const currentCtr = parseFloat((row.ctr || 0).toFixed(2));
    const currentConversionRate = row.clicks > 0 ? parseFloat(((row.purchases / row.clicks) * 100).toFixed(2)) : 0;
    const currentCpa = row.purchases > 0 ? parseFloat((row.spend / row.purchases).toFixed(2)) : 0;
    const currentCpc = row.clicks > 0 ? parseFloat((row.spend / row.clicks).toFixed(2)) : 0;
    const currentCpm = row.impressions > 0 ? parseFloat(((row.spend / row.impressions) * 1000).toFixed(2)) : 0;

    // Calculate previous period efficiency metrics
    const prevCtr = row.prev_impressions > 0 ? parseFloat(((row.prev_clicks / row.prev_impressions) * 100).toFixed(2)) : 0;
    const prevConversionRate = row.prev_clicks > 0 ? parseFloat(((row.prev_purchases / row.prev_clicks) * 100).toFixed(2)) : 0;
    const prevCpa = row.prev_purchases > 0 ? parseFloat((row.prev_spend / row.prev_purchases).toFixed(2)) : 0;
    const prevCpc = row.prev_clicks > 0 ? parseFloat((row.prev_spend / row.prev_clicks).toFixed(2)) : 0;
    const prevCpm = row.prev_impressions > 0 ? parseFloat(((row.prev_spend / row.prev_impressions) * 1000).toFixed(2)) : 0;

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
      ctr: {
        current: currentCtr,
        previous: prevCtr,
        change: prevCtr > 0 ? ((currentCtr - prevCtr) / prevCtr) * 100 : 0
      },
      conversionRate: {
        current: currentConversionRate,
        previous: prevConversionRate,
        change: prevConversionRate > 0 ? ((currentConversionRate - prevConversionRate) / prevConversionRate) * 100 : 0
      },
      cpa: {
        current: currentCpa,
        previous: prevCpa,
        change: prevCpa > 0 ? ((currentCpa - prevCpa) / prevCpa) * 100 : 0
      },
      cpc: {
        current: currentCpc,
        previous: prevCpc,
        change: prevCpc > 0 ? ((currentCpc - prevCpc) / prevCpc) * 100 : 0
      },
      cpm: {
        current: currentCpm,
        previous: prevCpm,
        change: prevCpm > 0 ? ((currentCpm - prevCpm) / prevCpm) * 100 : 0
      },
      trailing7d: {
        spend: parseFloat(row.trailing_7d_spend || 0),
        revenue: parseFloat(row.trailing_7d_revenue || 0),
        roas: parseFloat((row.trailing_7d_roas || 0).toFixed(2)),
        impressions: parseInt(row.trailing_7d_impressions || 0),
        clicks: parseInt(row.trailing_7d_clicks || 0),
        purchases: parseInt(row.trailing_7d_purchases || 0),
        prevSpend: parseFloat(row.trailing_7d_prev_spend || 0),
        prevRevenue: parseFloat(row.trailing_7d_prev_revenue || 0),
        prevRoas: parseFloat((row.trailing_7d_prev_roas || 0).toFixed(2)),
        prevImpressions: parseInt(row.trailing_7d_prev_impressions || 0),
        prevClicks: parseInt(row.trailing_7d_prev_clicks || 0),
        prevPurchases: parseInt(row.trailing_7d_prev_purchases || 0),
        spendChange: row.trailing_7d_prev_spend ? ((row.trailing_7d_spend - row.trailing_7d_prev_spend) / row.trailing_7d_prev_spend) * 100 : 0,
        revenueChange: row.trailing_7d_prev_revenue ? ((row.trailing_7d_revenue - row.trailing_7d_prev_revenue) / row.trailing_7d_prev_revenue) * 100 : 0,
        roasChange: row.trailing_7d_prev_roas ? ((row.trailing_7d_roas - row.trailing_7d_prev_roas) / row.trailing_7d_prev_roas) * 100 : 0,
        impressionsChange: row.trailing_7d_prev_impressions ? ((row.trailing_7d_impressions - row.trailing_7d_prev_impressions) / row.trailing_7d_prev_impressions) * 100 : 0,
        clicksChange: row.trailing_7d_prev_clicks ? ((row.trailing_7d_clicks - row.trailing_7d_prev_clicks) / row.trailing_7d_prev_clicks) * 100 : 0,
        purchasesChange: row.trailing_7d_prev_purchases ? ((row.trailing_7d_purchases - row.trailing_7d_prev_purchases) / row.trailing_7d_prev_purchases) * 100 : 0
      },
      trailing30d: {
        spend: parseFloat(row.trailing_30d_spend || 0),
        revenue: parseFloat(row.trailing_30d_revenue || 0),
        roas: parseFloat((row.trailing_30d_roas || 0).toFixed(2)),
        impressions: parseInt(row.trailing_30d_impressions || 0),
        clicks: parseInt(row.trailing_30d_clicks || 0),
        purchases: parseInt(row.trailing_30d_purchases || 0),
        prevSpend: parseFloat(row.trailing_30d_prev_spend || 0),
        prevRevenue: parseFloat(row.trailing_30d_prev_revenue || 0),
        prevRoas: parseFloat((row.trailing_30d_prev_roas || 0).toFixed(2)),
        prevImpressions: parseInt(row.trailing_30d_prev_impressions || 0),
        prevClicks: parseInt(row.trailing_30d_prev_clicks || 0),
        prevPurchases: parseInt(row.trailing_30d_prev_purchases || 0),
        spendChange: row.trailing_30d_prev_spend ? ((row.trailing_30d_spend - row.trailing_30d_prev_spend) / row.trailing_30d_prev_spend) * 100 : 0,
        revenueChange: row.trailing_30d_prev_revenue ? ((row.trailing_30d_revenue - row.trailing_30d_prev_revenue) / row.trailing_30d_prev_revenue) * 100 : 0,
        roasChange: row.trailing_30d_prev_roas ? ((row.trailing_30d_roas - row.trailing_30d_prev_roas) / row.trailing_30d_prev_roas) * 100 : 0,
        impressionsChange: row.trailing_30d_prev_impressions ? ((row.trailing_30d_impressions - row.trailing_30d_prev_impressions) / row.trailing_30d_prev_impressions) * 100 : 0,
        clicksChange: row.trailing_30d_prev_clicks ? ((row.trailing_30d_clicks - row.trailing_30d_prev_clicks) / row.trailing_30d_prev_clicks) * 100 : 0,
        purchasesChange: row.trailing_30d_prev_purchases ? ((row.trailing_30d_purchases - row.trailing_30d_prev_purchases) / row.trailing_30d_prev_purchases) * 100 : 0
      },
      dailyMetrics: row.daily_metrics.map((d: any) => ({
        date: d.date.value,
        revenue: Math.round(parseFloat(d.revenue_current || 0)),
        spend: Math.round(parseFloat(d.spend_current || 0)),
        roas: parseFloat((d.roas_current || 0).toFixed(2))
      })),
      campaigns: await getFacebookCampaigns(clientId, preset, startDate, endDate),
      ads: await getFacebookAds(clientId, preset, startDate, endDate)
    };
  } catch (error) {
    console.error('Error fetching Facebook performance data:', error);
    throw error;
  }
}

// Get Facebook performance by country
export async function getFacebookPerformanceByCountry(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, comparisonType);
  const comparisonDateFilter = comparisonType === 'previous-year' ? filters.prevYearDateFilter : filters.prevDateFilter;

  const query = `
    WITH current_period AS (
      SELECT
        country,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(purchases) as purchases,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100 as ctr
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_paid_media_performance\`
      WHERE platform = 'Facebook' AND ${filters.dateFilter}
      GROUP BY country
    ),
    comparison_period AS (
      SELECT
        country,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(purchases) as purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_paid_media_performance\`
      WHERE platform = 'Facebook' AND ${comparisonDateFilter}
      GROUP BY country
    ),
    trailing_7d AS (
      SELECT
        country,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_paid_media_performance\`
      WHERE platform = 'Facebook' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY country
    ),
    trailing_30d AS (
      SELECT
        country,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_paid_media_performance\`
      WHERE platform = 'Facebook' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY country
    )
    SELECT
      c.country,
      c.spend as current_spend,
      c.revenue as current_revenue,
      c.roas as current_roas,
      c.impressions,
      c.clicks,
      c.purchases as current_purchases,
      c.ctr,
      COALESCE(p.spend, 0) as previous_spend,
      COALESCE(p.revenue, 0) as previous_revenue,
      COALESCE(p.roas, 0) as previous_roas,
      COALESCE(p.purchases, 0) as previous_purchases,
      COALESCE(t7.spend, 0) as trailing_7d_spend,
      COALESCE(t7.revenue, 0) as trailing_7d_revenue,
      COALESCE(t7.roas, 0) as trailing_7d_roas,
      COALESCE(t30.spend, 0) as trailing_30d_spend,
      COALESCE(t30.revenue, 0) as trailing_30d_revenue,
      COALESCE(t30.roas, 0) as trailing_30d_roas
    FROM current_period c
    LEFT JOIN comparison_period p ON c.country = p.country
    LEFT JOIN trailing_7d t7 ON c.country = t7.country
    LEFT JOIN trailing_30d t30 ON c.country = t30.country
    ORDER BY c.revenue DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      country: row.country,
      spend: parseFloat(row.current_spend || 0),
      revenue: parseFloat(row.current_revenue || 0),
      roas: parseFloat(row.current_roas || 0),
      impressions: parseInt(row.impressions || 0),
      clicks: parseInt(row.clicks || 0),
      purchases: parseInt(row.current_purchases || 0),
      ctr: parseFloat(row.ctr || 0),
      previousSpend: parseFloat(row.previous_spend || 0),
      previousRevenue: parseFloat(row.previous_revenue || 0),
      previousRoas: parseFloat(row.previous_roas || 0),
      previousPurchases: parseInt(row.previous_purchases || 0),
      spendChange: row.previous_spend > 0 ? ((parseFloat(row.current_spend || 0) - parseFloat(row.previous_spend || 0)) / parseFloat(row.previous_spend || 0)) * 100 : 0,
      revenueChange: row.previous_revenue > 0 ? ((parseFloat(row.current_revenue || 0) - parseFloat(row.previous_revenue || 0)) / parseFloat(row.previous_revenue || 0)) * 100 : 0,
      roasChange: row.previous_roas > 0 ? ((parseFloat(row.current_roas || 0) - parseFloat(row.previous_roas || 0)) / parseFloat(row.previous_roas || 0)) * 100 : 0,
      trailing7d: {
        spend: parseFloat(row.trailing_7d_spend || 0),
        revenue: parseFloat(row.trailing_7d_revenue || 0),
        roas: parseFloat(row.trailing_7d_roas || 0)
      },
      trailing30d: {
        spend: parseFloat(row.trailing_30d_spend || 0),
        revenue: parseFloat(row.trailing_30d_revenue || 0),
        roas: parseFloat(row.trailing_30d_roas || 0)
      }
    }));
  } catch (error) {
    console.error('Error fetching Facebook performance by country:', error);
    return [];
  }
}

// Get Facebook campaigns data
async function getFacebookCampaigns(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, 'previous-period');

  const query = `
    SELECT
      campaign_name,
      COUNT(DISTINCT date) as days_active,
      COUNT(DISTINCT adset_name) as adsets,
      COUNT(DISTINCT ad_name) as ads,
      ROUND(SUM(spend), 2) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(purchases) as total_purchases,
      ROUND(SUM(revenue), 2) as total_revenue,
      MAX(reach) as total_reach,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas,
      ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(clicks)), 2) as cpc,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(purchases)), 2) as cpa,
      ROUND(SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100, 2) as conversion_rate,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(purchases)), 2) as avg_order_value
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE platform = 'Facebook'
      AND ${filters.dateFilter}
    GROUP BY campaign_name
    HAVING SUM(spend) > 0
    ORDER BY total_spend DESC
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      campaignName: row.campaign_name,
      spend: parseFloat(row.total_spend || 0),
      purchaseValue: parseFloat(row.total_revenue || 0),
      purchases: parseInt(row.total_purchases || 0),
      clicks: parseInt(row.total_clicks || 0),
      impressions: parseInt(row.total_impressions || 0),
      reach: parseInt(row.total_reach || 0),
      roas: parseFloat(row.roas || 0)
    }));
  } catch (error) {
    console.error('Error fetching Facebook campaigns:', error);
    return [];
  }
}

// Get Facebook ads data (ad-level)
async function getFacebookAds(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, 'previous-period');

  const query = `
    SELECT
      campaign_name,
      adset_name,
      ad_name,
      COUNT(DISTINCT date) as days_active,
      ROUND(SUM(spend), 2) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(purchases) as total_purchases,
      ROUND(SUM(revenue), 2) as total_revenue,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas,
      ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(clicks)), 2) as cpc,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(purchases)), 2) as cpa,
      ROUND(SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100, 2) as conversion_rate,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(purchases)), 2) as avg_order_value,
      MAX(date) as last_active_date
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE platform = 'Facebook'
      AND ${filters.dateFilter}
    GROUP BY campaign_name, adset_name, ad_name
    HAVING SUM(spend) > 0
    ORDER BY total_spend DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      campaignName: row.campaign_name,
      adsetName: row.adset_name,
      adName: row.ad_name,
      daysActive: parseInt(row.days_active || 0),
      spend: parseFloat(row.total_spend || 0),
      impressions: parseInt(row.total_impressions || 0),
      clicks: parseInt(row.total_clicks || 0),
      purchases: parseInt(row.total_purchases || 0),
      revenue: parseFloat(row.total_revenue || 0),
      roas: parseFloat(row.roas || 0),
      ctr: parseFloat(row.ctr || 0),
      cpc: parseFloat(row.cpc || 0),
      cpa: parseFloat(row.cpa || 0),
      conversionRate: parseFloat(row.conversion_rate || 0),
      aov: parseFloat(row.avg_order_value || 0),
      lastActiveDate: row.last_active_date?.value || null
    }));
  } catch (error) {
    console.error('Error fetching Facebook ads:', error);
    return [];
  }
}

// Get Google Ads performance data
export async function getGoogleAdsPerformanceData(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string, comparisonType: string = 'previous-period'): Promise<any> {
  const datasetName = getDatasetName(clientId);
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
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads' AND ${filters.dateFilter}
    ),
    comparison_period AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads' AND ${comparisonDateFilter}
    ),
    current_daily AS (
      SELECT
        date,
        SUM(revenue) as revenue_current,
        SUM(spend) as spend_current
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads' AND ${filters.dateFilter}
      GROUP BY date
    ),
    comparison_daily AS (
      SELECT
        date,
        0 as revenue_comparison,
        0 as spend_comparison
      FROM current_daily
      WHERE 1=0
    ),
    daily_metrics AS (
      SELECT
        cd.date,
        cd.revenue_current,
        COALESCE(cpd.revenue_comparison, 0) as revenue_comparison,
        cd.spend_current,
        COALESCE(cpd.spend_comparison, 0) as spend_comparison,
        SAFE_DIVIDE(cd.revenue_current, cd.spend_current) as roas_current,
        SAFE_DIVIDE(COALESCE(cpd.revenue_comparison, 0), COALESCE(cpd.spend_comparison, 0)) as roas_comparison
      FROM current_daily cd
      LEFT JOIN comparison_daily cpd ON cd.date = cpd.date
      ORDER BY cd.date
    ),
    trailing_7d AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads'
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        AND date < CURRENT_DATE()
    ),
    trailing_7d_comparison AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads'
        AND date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR), INTERVAL 7 DAY)
        AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)
    ),
    trailing_30d AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads'
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        AND date < CURRENT_DATE()
    ),
    trailing_30d_comparison AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE platform = 'Google Ads'
        AND date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR), INTERVAL 30 DAY)
        AND date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)
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
      (SELECT total_spend FROM trailing_7d) as trailing_7d_spend,
      (SELECT total_revenue FROM trailing_7d) as trailing_7d_revenue,
      (SELECT roas FROM trailing_7d) as trailing_7d_roas,
      (SELECT total_impressions FROM trailing_7d) as trailing_7d_impressions,
      (SELECT total_clicks FROM trailing_7d) as trailing_7d_clicks,
      (SELECT total_purchases FROM trailing_7d) as trailing_7d_purchases,
      (SELECT total_spend FROM trailing_7d_comparison) as trailing_7d_prev_spend,
      (SELECT total_revenue FROM trailing_7d_comparison) as trailing_7d_prev_revenue,
      (SELECT roas FROM trailing_7d_comparison) as trailing_7d_prev_roas,
      (SELECT total_impressions FROM trailing_7d_comparison) as trailing_7d_prev_impressions,
      (SELECT total_clicks FROM trailing_7d_comparison) as trailing_7d_prev_clicks,
      (SELECT total_purchases FROM trailing_7d_comparison) as trailing_7d_prev_purchases,
      (SELECT total_spend FROM trailing_30d) as trailing_30d_spend,
      (SELECT total_revenue FROM trailing_30d) as trailing_30d_revenue,
      (SELECT roas FROM trailing_30d) as trailing_30d_roas,
      (SELECT total_impressions FROM trailing_30d) as trailing_30d_impressions,
      (SELECT total_clicks FROM trailing_30d) as trailing_30d_clicks,
      (SELECT total_purchases FROM trailing_30d) as trailing_30d_purchases,
      (SELECT total_spend FROM trailing_30d_comparison) as trailing_30d_prev_spend,
      (SELECT total_revenue FROM trailing_30d_comparison) as trailing_30d_prev_revenue,
      (SELECT roas FROM trailing_30d_comparison) as trailing_30d_prev_roas,
      (SELECT total_impressions FROM trailing_30d_comparison) as trailing_30d_prev_impressions,
      (SELECT total_clicks FROM trailing_30d_comparison) as trailing_30d_prev_clicks,
      (SELECT total_purchases FROM trailing_30d_comparison) as trailing_30d_prev_purchases,
      ARRAY_AGG(STRUCT(date, revenue_current, revenue_comparison, spend_current, spend_comparison, roas_current, roas_comparison) ORDER BY date) as daily_metrics
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

    // Calculate current period efficiency metrics
    const currentCtr = parseFloat((row.ctr || 0).toFixed(2));
    const currentConversionRate = row.clicks > 0 ? parseFloat(((row.purchases / row.clicks) * 100).toFixed(2)) : 0;
    const currentCpa = row.purchases > 0 ? parseFloat((row.spend / row.purchases).toFixed(2)) : 0;
    const currentCpc = row.clicks > 0 ? parseFloat((row.spend / row.clicks).toFixed(2)) : 0;
    const currentCpm = row.impressions > 0 ? parseFloat(((row.spend / row.impressions) * 1000).toFixed(2)) : 0;

    // Calculate previous period efficiency metrics
    const prevCtr = row.prev_impressions > 0 ? parseFloat(((row.prev_clicks / row.prev_impressions) * 100).toFixed(2)) : 0;
    const prevConversionRate = row.prev_clicks > 0 ? parseFloat(((row.prev_purchases / row.prev_clicks) * 100).toFixed(2)) : 0;
    const prevCpa = row.prev_purchases > 0 ? parseFloat((row.prev_spend / row.prev_purchases).toFixed(2)) : 0;
    const prevCpc = row.prev_clicks > 0 ? parseFloat((row.prev_spend / row.prev_clicks).toFixed(2)) : 0;
    const prevCpm = row.prev_impressions > 0 ? parseFloat(((row.prev_spend / row.prev_impressions) * 1000).toFixed(2)) : 0;

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
      ctr: {
        current: currentCtr,
        previous: prevCtr,
        change: prevCtr > 0 ? ((currentCtr - prevCtr) / prevCtr) * 100 : 0
      },
      conversionRate: {
        current: currentConversionRate,
        previous: prevConversionRate,
        change: prevConversionRate > 0 ? ((currentConversionRate - prevConversionRate) / prevConversionRate) * 100 : 0
      },
      cpa: {
        current: currentCpa,
        previous: prevCpa,
        change: prevCpa > 0 ? ((currentCpa - prevCpa) / prevCpa) * 100 : 0
      },
      cpc: {
        current: currentCpc,
        previous: prevCpc,
        change: prevCpc > 0 ? ((currentCpc - prevCpc) / prevCpc) * 100 : 0
      },
      cpm: {
        current: currentCpm,
        previous: prevCpm,
        change: prevCpm > 0 ? ((currentCpm - prevCpm) / prevCpm) * 100 : 0
      },
      trailing7d: {
        spend: parseFloat(row.trailing_7d_spend || 0),
        revenue: parseFloat(row.trailing_7d_revenue || 0),
        roas: parseFloat((row.trailing_7d_roas || 0).toFixed(2)),
        impressions: parseInt(row.trailing_7d_impressions || 0),
        clicks: parseInt(row.trailing_7d_clicks || 0),
        purchases: parseInt(row.trailing_7d_purchases || 0),
        prevSpend: parseFloat(row.trailing_7d_prev_spend || 0),
        prevRevenue: parseFloat(row.trailing_7d_prev_revenue || 0),
        prevRoas: parseFloat((row.trailing_7d_prev_roas || 0).toFixed(2)),
        prevImpressions: parseInt(row.trailing_7d_prev_impressions || 0),
        prevClicks: parseInt(row.trailing_7d_prev_clicks || 0),
        prevPurchases: parseInt(row.trailing_7d_prev_purchases || 0),
        spendChange: row.trailing_7d_prev_spend ? ((row.trailing_7d_spend - row.trailing_7d_prev_spend) / row.trailing_7d_prev_spend) * 100 : 0,
        revenueChange: row.trailing_7d_prev_revenue ? ((row.trailing_7d_revenue - row.trailing_7d_prev_revenue) / row.trailing_7d_prev_revenue) * 100 : 0,
        roasChange: row.trailing_7d_prev_roas ? ((row.trailing_7d_roas - row.trailing_7d_prev_roas) / row.trailing_7d_prev_roas) * 100 : 0,
        impressionsChange: row.trailing_7d_prev_impressions ? ((row.trailing_7d_impressions - row.trailing_7d_prev_impressions) / row.trailing_7d_prev_impressions) * 100 : 0,
        clicksChange: row.trailing_7d_prev_clicks ? ((row.trailing_7d_clicks - row.trailing_7d_prev_clicks) / row.trailing_7d_prev_clicks) * 100 : 0,
        purchasesChange: row.trailing_7d_prev_purchases ? ((row.trailing_7d_purchases - row.trailing_7d_prev_purchases) / row.trailing_7d_prev_purchases) * 100 : 0
      },
      trailing30d: {
        spend: parseFloat(row.trailing_30d_spend || 0),
        revenue: parseFloat(row.trailing_30d_revenue || 0),
        roas: parseFloat((row.trailing_30d_roas || 0).toFixed(2)),
        impressions: parseInt(row.trailing_30d_impressions || 0),
        clicks: parseInt(row.trailing_30d_clicks || 0),
        purchases: parseInt(row.trailing_30d_purchases || 0),
        prevSpend: parseFloat(row.trailing_30d_prev_spend || 0),
        prevRevenue: parseFloat(row.trailing_30d_prev_revenue || 0),
        prevRoas: parseFloat((row.trailing_30d_prev_roas || 0).toFixed(2)),
        prevImpressions: parseInt(row.trailing_30d_prev_impressions || 0),
        prevClicks: parseInt(row.trailing_30d_prev_clicks || 0),
        prevPurchases: parseInt(row.trailing_30d_prev_purchases || 0),
        spendChange: row.trailing_30d_prev_spend ? ((row.trailing_30d_spend - row.trailing_30d_prev_spend) / row.trailing_30d_prev_spend) * 100 : 0,
        revenueChange: row.trailing_30d_prev_revenue ? ((row.trailing_30d_revenue - row.trailing_30d_prev_revenue) / row.trailing_30d_prev_revenue) * 100 : 0,
        roasChange: row.trailing_30d_prev_roas ? ((row.trailing_30d_roas - row.trailing_30d_prev_roas) / row.trailing_30d_prev_roas) * 100 : 0,
        impressionsChange: row.trailing_30d_prev_impressions ? ((row.trailing_30d_impressions - row.trailing_30d_prev_impressions) / row.trailing_30d_prev_impressions) * 100 : 0,
        clicksChange: row.trailing_30d_prev_clicks ? ((row.trailing_30d_clicks - row.trailing_30d_prev_clicks) / row.trailing_30d_prev_clicks) * 100 : 0,
        purchasesChange: row.trailing_30d_prev_purchases ? ((row.trailing_30d_purchases - row.trailing_30d_prev_purchases) / row.trailing_30d_prev_purchases) * 100 : 0
      },
      dailyMetrics: row.daily_metrics.map((d: any) => ({
        date: d.date.value,
        revenue: Math.round(parseFloat(d.revenue_current || 0)),
        spend: Math.round(parseFloat(d.spend_current || 0)),
        roas: parseFloat((d.roas_current || 0).toFixed(2))
      })),
      campaigns: await getGoogleAdsCampaigns(clientId, preset, startDate, endDate),
      ads: await getGoogleAdsAds(clientId, preset, startDate, endDate)
    };
  } catch (error) {
    console.error('Error fetching Google Ads performance data:', error);
    throw error;
  }
}

// Get Google Ads campaigns data
async function getGoogleAdsCampaigns(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, 'previous-period');

  const query = `
    SELECT
      campaign_name,
      COUNT(DISTINCT date) as days_active,
      COUNT(DISTINCT adset_name) as adsets,
      COUNT(DISTINCT ad_name) as ads,
      ROUND(SUM(spend), 2) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(purchases) as total_purchases,
      ROUND(SUM(revenue), 2) as total_revenue,
      MAX(reach) as total_reach,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas,
      ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(clicks)), 2) as cpc,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(purchases)), 2) as cpa,
      ROUND(SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100, 2) as conversion_rate,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(purchases)), 2) as avg_order_value
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE platform = 'Google Ads'
      AND ${filters.dateFilter}
    GROUP BY campaign_name
    HAVING SUM(spend) > 0
    ORDER BY total_spend DESC
    LIMIT 20
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      campaignName: row.campaign_name,
      spend: parseFloat(row.total_spend || 0),
      purchaseValue: parseFloat(row.total_revenue || 0),
      purchases: parseInt(row.total_purchases || 0),
      clicks: parseInt(row.total_clicks || 0),
      impressions: parseInt(row.total_impressions || 0),
      reach: parseInt(row.total_reach || 0),
      roas: parseFloat(row.roas || 0)
    }));
  } catch (error) {
    console.error('Error fetching Google Ads campaigns:', error);
    return [];
  }
}

// Get Google Ads ads data (ad-level)
async function getGoogleAdsAds(clientId: string, preset: string = 'mtd', startDate?: string, endDate?: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const filters = getPaidMediaDateFilterSQL(preset, startDate, endDate, 'previous-period');

  const query = `
    SELECT
      campaign_name,
      adset_name,
      ad_name,
      COUNT(DISTINCT date) as days_active,
      ROUND(SUM(spend), 2) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(purchases) as total_purchases,
      ROUND(SUM(revenue), 2) as total_revenue,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(spend)), 2) as roas,
      ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(clicks)), 2) as cpc,
      ROUND(SAFE_DIVIDE(SUM(spend), SUM(purchases)), 2) as cpa,
      ROUND(SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100, 2) as conversion_rate,
      ROUND(SAFE_DIVIDE(SUM(revenue), SUM(purchases)), 2) as avg_order_value,
      MAX(date) as last_active_date
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE platform = 'Google Ads'
      AND ${filters.dateFilter}
    GROUP BY campaign_name, adset_name, ad_name
    HAVING SUM(spend) > 0
    ORDER BY total_spend DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      campaignName: row.campaign_name,
      adsetName: row.adset_name,
      adName: row.ad_name,
      spend: parseFloat(row.total_spend || 0),
      purchaseValue: parseFloat(row.total_revenue || 0),
      purchases: parseInt(row.total_purchases || 0),
      clicks: parseInt(row.total_clicks || 0),
      impressions: parseInt(row.total_impressions || 0),
      roas: parseFloat(row.roas || 0),
      ctr: parseFloat(row.ctr || 0),
      cpc: parseFloat(row.cpc || 0),
      cpa: parseFloat(row.cpa || 0),
      conversionRate: parseFloat(row.conversion_rate || 0),
      avgOrderValue: parseFloat(row.avg_order_value || 0),
      lastActiveDate: row.last_active_date?.value || null
    }));
  } catch (error) {
    console.error('Error fetching Google Ads ads:', error);
    return [];
  }
}

// Get campaign intelligent analysis
export async function getCampaignIntelligentAnalysis(clientId: string, campaignName: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT *
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_intelligent_campaign_analysis\`
    WHERE campaign_name = @campaignName
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { campaignName },
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      campaignName: row.campaign_name,
      spend30d: parseFloat(row.spend_30d || 0),
      revenue30d: parseFloat(row.revenue_30d || 0),
      purchases30d: parseInt(row.purchases_30d || 0),
      roas30d: parseFloat(row.roas_30d || 0),
      ctr30d: parseFloat(row.ctr_30d || 0),
      cpa30d: parseFloat(row.cpa_30d || 0),
      lifetimeSpend: parseFloat(row.lifetime_spend || 0),
      lifetimeRoas: parseFloat(row.lifetime_roas || 0),
      totalDaysActive: parseInt(row.total_days_active || 0),
      campaignAgeDays: parseInt(row.campaign_age_days || 0),
      statisticalConfidence: row.statistical_confidence,
      roasVolatility: parseFloat(row.roas_volatility || 0),
      worstDayRoas: parseFloat(row.worst_day_roas || 0),
      bestDayRoas: parseFloat(row.best_day_roas || 0),
      coefficientOfVariation: parseFloat(row.coefficient_of_variation || 0),
      performanceTrend: row.performance_trend,
      week1Roas: parseFloat(row.week1_roas || 0),
      week4Roas: parseFloat(row.week4_roas || 0),
      roasChange4wk: parseFloat(row.roas_change_4wk || 0),
      roasChangeVsPrev: parseFloat(row.roas_change_vs_prev || 0),
      spendChangePct: parseFloat(row.spend_change_pct || 0),
      revenueChangePct: parseFloat(row.revenue_change_pct || 0),
      lowSpendRoas: parseFloat(row.low_spend_roas || 0),
      highSpendRoas: parseFloat(row.high_spend_roas || 0),
      scalingEfficiency: parseFloat(row.scaling_efficiency || 0),
      scalingCategory: row.scaling_category,
      roasVsAccountAvg: parseFloat(row.roas_vs_account_avg || 0),
      roasIndexVsAccount: parseFloat(row.roas_index_vs_account || 0),
      shareOfSpend: parseFloat(row.share_of_spend || 0),
      shareOfRevenue: parseFloat(row.share_of_revenue || 0),
      efficiencyIndex: parseFloat(row.efficiency_index || 0),
      avgFrequency: parseFloat(row.avg_frequency || 0),
      fatigueRisk: row.fatigue_risk,
      healthScore: parseInt(row.health_score || 0),
      recommendedAction: row.recommended_action,
      riskFlags: row.risk_flags
    };
  } catch (error) {
    console.error('Error fetching campaign intelligent analysis:', error);
    throw error;
  }
}

// Get campaign performance timeseries
export async function getCampaignPerformanceTimeseries(clientId: string, campaignName: string, days: number = 30): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT *
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_campaign_performance_timeseries\`
    WHERE campaign_name = @campaignName
      AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    ORDER BY date ASC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { campaignName, days },
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      date: row.date.value,
      dailySpend: parseFloat(row.daily_spend || 0),
      dailyRevenue: parseFloat(row.daily_revenue || 0),
      dailyPurchases: parseInt(row.daily_purchases || 0),
      dailyRoas: parseFloat(row.daily_roas || 0),
      dailyCtr: parseFloat(row.daily_ctr || 0),
      dailyCvr: parseFloat(row.daily_cvr || 0),
      dailyFrequency: parseFloat(row.daily_frequency || 0),
      spend7dAvg: parseFloat(row.spend_7d_avg || 0),
      roas7dAvg: parseFloat(row.roas_7d_avg || 0),
      spend14dAvg: parseFloat(row.spend_14d_avg || 0),
      roas14dAvg: parseFloat(row.roas_14d_avg || 0),
      spend30dAvg: parseFloat(row.spend_30d_avg || 0),
      roas30dAvg: parseFloat(row.roas_30d_avg || 0),
      spend30dSum: parseFloat(row.spend_30d_sum || 0),
      revenue30dSum: parseFloat(row.revenue_30d_sum || 0),
      purchases30dSum: parseInt(row.purchases_30d_sum || 0),
      roas30dRolling: parseFloat(row.roas_30d_rolling || 0),
      roas30dVolatility: parseFloat(row.roas_30d_volatility || 0),
      roasWowChange: parseFloat(row.roas_wow_change || 0),
      roasMomChange: parseFloat(row.roas_mom_change || 0),
      spendMomentum7d: parseFloat(row.spend_momentum_7d || 0),
      trendDirection: row.trend_direction,
      volatilityFlag: row.volatility_flag,
      frequencyStatus: row.frequency_status
    }));
  } catch (error) {
    console.error('Error fetching campaign performance timeseries:', error);
    return [];
  }
}

// Get contextualized campaign performance
export async function getContextualizedCampaignPerformance(clientId: string, campaignName: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      business_health_index,
      business_revenue_trend,
      business_demand_trend,
      business_yoy_status,
      campaign_share_of_revenue,
      campaign_share_of_orders,
      relative_performance,
      contextualized_recommendation,
      context_flags
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_contextualized_campaign_performance\`
    WHERE campaign_name = @campaignName
    ORDER BY date DESC
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { campaignName },
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      businessHealthIndex: parseFloat(row.business_health_index || 0),
      businessRevenueTrend: row.business_revenue_trend,
      businessDemandTrend: row.business_demand_trend,
      businessYoyStatus: row.business_yoy_status,
      campaignShareOfRevenue: parseFloat(row.campaign_share_of_revenue || 0),
      campaignShareOfOrders: parseFloat(row.campaign_share_of_orders || 0),
      relativePerformance: row.relative_performance,
      contextualizedRecommendation: row.contextualized_recommendation,
      contextFlags: row.context_flags
    };
  } catch (error) {
    console.error('Error fetching contextualized campaign performance:', error);
    return null;
  }
}

// Get ad intelligent analysis
export async function getAdIntelligentAnalysis(clientId: string, adName: string, adsetName: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      ai.*,
      -- Add funnel intelligence fields from paid_media_performance (optimized subquery)
      (SELECT current_funnel_stage FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND current_funnel_stage IS NOT NULL
       ORDER BY date DESC LIMIT 1) as current_funnel_stage,
      (SELECT inferred_funnel_stage FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND inferred_funnel_stage IS NOT NULL
       ORDER BY date DESC LIMIT 1) as inferred_funnel_stage,
      (SELECT is_misclassified FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND is_misclassified IS NOT NULL
       ORDER BY date DESC LIMIT 1) as is_misclassified,
      (SELECT AVG(tofu_score) FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as tofu_score,
      (SELECT AVG(mofu_score) FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as mofu_score,
      (SELECT AVG(bofu_score) FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
       WHERE ad_name = @ad_name AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as bofu_score
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_intelligent_ad_analysis\` ai
    WHERE ai.ad_name = @ad_name
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { ad_name: adName },
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      adName: row.ad_name,
      campaignName: row.campaign_name,
      spend30d: parseFloat(row.spend_30d || 0),
      revenue30d: parseFloat(row.revenue_30d || 0),
      purchases30d: parseInt(row.purchases_30d || 0),
      roas30d: parseFloat(row.roas_30d || 0),
      ctr30d: parseFloat(row.ctr_30d || 0),
      cpa30d: parseFloat(row.cpa_30d || 0),
      lifetimeSpend: parseFloat(row.lifetime_spend || 0),
      lifetimeRoas: parseFloat(row.lifetime_roas || 0),
      totalDaysActive: parseInt(row.total_days_active || 0),
      adAgeDays: parseInt(row.ad_age_days || 0),
      firstSeenDate: row.first_seen_date,
      lastSeenDate: row.last_seen_date,
      statisticalConfidence: row.statistical_confidence,
      roasVolatility: parseFloat(row.roas_volatility || 0),
      worstDayRoas: parseFloat(row.worst_day_roas || 0),
      bestDayRoas: parseFloat(row.best_day_roas || 0),
      coefficientOfVariation: parseFloat(row.coefficient_of_variation || 0),
      performanceTrend: row.performance_trend,
      week1Roas: parseFloat(row.week1_roas || 0),
      week2Roas: parseFloat(row.week2_roas || 0),
      week3Roas: parseFloat(row.week3_roas || 0),
      week4Roas: parseFloat(row.week4_roas || 0),
      roasChange4wk: parseFloat(row.roas_change_4wk || 0),
      roasChangeVsPrev: parseFloat(row.roas_change_vs_prev || 0),
      spendChangePct: parseFloat(row.spend_change_pct || 0),
      revenueChangePct: parseFloat(row.revenue_change_pct || 0),
      lowSpendRoas: parseFloat(row.low_spend_roas || 0),
      highSpendRoas: parseFloat(row.high_spend_roas || 0),
      scalingEfficiency: parseFloat(row.scaling_efficiency || 0),
      scalingCategory: row.scaling_category,
      roasVsAccountAvg: parseFloat(row.roas_vs_account_avg || 0),
      roasIndexVsAccount: parseFloat(row.roas_index_vs_account || 0),
      shareOfSpend: parseFloat(row.share_of_spend || 0),
      shareOfRevenue: parseFloat(row.share_of_revenue || 0),
      efficiencyIndex: parseFloat(row.efficiency_index || 0),
      avgFrequency: parseFloat(row.avg_frequency || 0),
      fatigueRisk: row.fatigue_risk,
      healthScore: parseInt(row.health_score || 0),
      recommendedAction: row.recommended_action,
      riskFlags: row.risk_flags,
      // Funnel intelligence fields
      currentFunnelStage: row.current_funnel_stage || null,
      inferredFunnelStage: row.inferred_funnel_stage || null,
      isMisclassified: row.is_misclassified || false,
      tofuScore: parseFloat(row.tofu_score || 0),
      mofuScore: parseFloat(row.mofu_score || 0),
      bofuScore: parseFloat(row.bofu_score || 0)
    };
  } catch (error) {
    console.error('Error fetching ad intelligent analysis:', error);
    throw error;
  }
}

// Get ad performance timeseries
export async function getAdPerformanceTimeseries(clientId: string, adName: string, adsetName: string, days: number = 30): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      date,
      spend,
      revenue,
      SAFE_DIVIDE(revenue, spend) as roas
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE ad_name = @ad_name
      AND adset_name = @adset_name
      AND platform = 'Facebook'
      AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    ORDER BY date ASC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { ad_name: adName, adset_name: adsetName, days },
      timeoutMs: 30000,
    });

    // Calculate rolling averages
    const data = rows.map(row => ({
      date: row.date?.value || row.date,
      spend: parseFloat(row.spend || 0),
      revenue: parseFloat(row.revenue || 0),
      roas: parseFloat(row.roas || 0)
    }));

    // Add rolling averages
    return data.map((row, idx) => {
      const window7 = data.slice(Math.max(0, idx - 6), idx + 1);
      const window30 = data.slice(Math.max(0, idx - 29), idx + 1);

      const roas7dAvg = window7.reduce((sum, r) => sum + r.roas, 0) / window7.length;
      const roas30dAvg = window30.reduce((sum, r) => sum + r.roas, 0) / window30.length;

      return {
        date: row.date,
        dailySpend: row.spend,
        dailyRevenue: row.revenue,
        dailyRoas: row.roas,
        roas7dAvg,
        roas30dAvg
      };
    });
  } catch (error) {
    console.error('Error fetching ad performance timeseries:', error);
    return [];
  }
}

// Get ad performance distribution within campaign
export async function getAdDistributionForCampaign(clientId: string, campaignName: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      campaign_name,

      -- Campaign metrics
      MAX(CASE WHEN rn = 1 THEN campaign_roas END) as campaign_roas,
      MAX(CASE WHEN rn = 1 THEN campaign_health END) as campaign_health,

      -- Ad distribution
      COUNT(DISTINCT ad_name) as total_ads,
      AVG(ad_health) as avg_ad_health,
      MIN(ad_health) as worst_ad_health,
      MAX(ad_health) as best_ad_health,

      -- Performance buckets
      SUM(CASE WHEN ad_health >= 80 THEN 1 ELSE 0 END) as excellent_ads,
      SUM(CASE WHEN ad_health BETWEEN 60 AND 79 THEN 1 ELSE 0 END) as good_ads,
      SUM(CASE WHEN ad_health BETWEEN 40 AND 59 THEN 1 ELSE 0 END) as fair_ads,
      SUM(CASE WHEN ad_health < 40 THEN 1 ELSE 0 END) as poor_ads,

      -- Action summary
      SUM(CASE WHEN ad_recommended_action LIKE '%SCALE%' THEN 1 ELSE 0 END) as ads_to_scale,
      SUM(CASE WHEN ad_recommended_action LIKE '%PAUSE%' THEN 1 ELSE 0 END) as ads_to_pause,
      SUM(CASE WHEN ad_recommended_action LIKE '%REFRESH%' THEN 1 ELSE 0 END) as ads_to_refresh

    FROM (
      SELECT
        c.campaign_name,
        c.roas_30d as campaign_roas,
        c.health_score as campaign_health,
        a.ad_name,
        a.health_score as ad_health,
        a.recommended_action as ad_recommended_action,
        ROW_NUMBER() OVER (PARTITION BY c.campaign_name ORDER BY a.spend_30d DESC) as rn
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_intelligent_campaign_analysis\` c
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_intelligent_ad_analysis\` a
        ON c.campaign_name = a.campaign_name
      WHERE c.campaign_name = @campaign_name
    )
    GROUP BY campaign_name
    HAVING COUNT(DISTINCT ad_name) > 0
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { campaign_name: campaignName },
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      campaignName: row.campaign_name,
      campaignRoas: parseFloat(row.campaign_roas || 0),
      campaignHealth: parseInt(row.campaign_health || 0),
      totalAds: parseInt(row.total_ads || 0),
      avgAdHealth: parseFloat(row.avg_ad_health || 0),
      worstAdHealth: parseFloat(row.worst_ad_health || 0),
      bestAdHealth: parseFloat(row.best_ad_health || 0),
      excellentAds: parseInt(row.excellent_ads || 0),
      goodAds: parseInt(row.good_ads || 0),
      fairAds: parseInt(row.fair_ads || 0),
      poorAds: parseInt(row.poor_ads || 0),
      adsToScale: parseInt(row.ads_to_scale || 0),
      adsToPause: parseInt(row.ads_to_pause || 0),
      adsToRefresh: parseInt(row.ads_to_refresh || 0)
    };
  } catch (error) {
    console.error('Error fetching ad distribution for campaign:', error);
    return null;
  }
}

// Get list of ads in campaign
export async function getCampaignAdsList(clientId: string, campaignName: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      ad_name,
      health_score,
      roas_30d,
      spend_30d,
      recommended_action,
      performance_trend
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_intelligent_ad_analysis\`
    WHERE campaign_name = @campaign_name
    ORDER BY health_score DESC, spend_30d DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      params: { campaign_name: campaignName },
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      adName: row.ad_name,
      healthScore: parseInt(row.health_score || 0),
      roas30d: parseFloat(row.roas_30d || 0),
      spend30d: parseFloat(row.spend_30d || 0),
      recommendedAction: row.recommended_action,
      performanceTrend: row.performance_trend
    }));
  } catch (error) {
    console.error('Error fetching campaign ads list:', error);
    return [];
  }
}

// Funnel Optimization: Get all-star bundles by optimization goal and country
export async function getAllStarBundlesByGoal(clientId: string, goal: string = 'composite', country: string = 'United States'): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  let query = '';

  switch(goal) {
    case 'awareness':
      // TOFU - Maximize Clicks + Low CPC
      query = `
        SELECT
          'AWARENESS_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          clicks_rank as rank,
          total_clicks,
          ROUND(cpc, 2) as cpc,
          ROUND(ctr_percent, 1) as ctr_pct,
          ROUND(total_spend, 2) as spend,
          ROUND(roas, 2) as roas,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND recommended_stage = 'TOFU'
          AND clicks_rank <= 3
        ORDER BY clicks_rank
      `;
      break;

    case 'efficiency':
      // TOFU - Lowest CPC
      query = `
        SELECT
          'EFFICIENCY_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          efficiency_rank as rank,
          ROUND(cpc, 2) as cpc,
          total_clicks,
          ROUND(ctr_percent, 1) as ctr_pct,
          ROUND(total_spend, 2) as spend,
          ROUND(roas, 2) as roas,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND recommended_stage = 'TOFU'
          AND efficiency_rank <= 3
        ORDER BY efficiency_rank
      `;
      break;

    case 'engagement':
      // Highest CTR across all stages
      query = `
        SELECT
          'ENGAGEMENT_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          ctr_rank as rank,
          ROUND(ctr_percent, 1) as ctr_pct,
          total_clicks,
          ROUND(cpc, 2) as cpc,
          ROUND(total_spend, 2) as spend,
          ROUND(roas, 2) as roas,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND ctr_rank <= 3
        ORDER BY ctr_rank
      `;
      break;

    case 'revenue':
      // BOFU - Highest ROAS
      query = `
        SELECT
          'ROAS_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          roas_rank as rank,
          ROUND(roas, 2) as roas,
          ROUND(total_spend, 2) as spend,
          total_purchases,
          ROUND(conversion_rate_percent, 1) as conv_rate_pct,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND recommended_stage = 'BOFU'
          AND roas_rank <= 3
        ORDER BY roas_rank
      `;
      break;

    case 'conversion':
      // BOFU - Highest Conversion Rate
      query = `
        SELECT
          'CONVERSION_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          conversion_rank as rank,
          ROUND(conversion_rate_percent, 1) as conv_rate_pct,
          total_purchases,
          ROUND(roas, 2) as roas,
          ROUND(total_spend, 2) as spend,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND recommended_stage = 'BOFU'
          AND conversion_rank <= 3
        ORDER BY conversion_rank
      `;
      break;

    case 'allstars':
      // All-Star Bundles - Top 3 per stage
      query = `
        SELECT
          'ALL_STARS' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          all_star_rank as rank,
          ROUND(roas, 2) as roas,
          total_clicks,
          ROUND(ctr_percent, 1) as ctr_pct,
          ROUND(cpc, 2) as cpc,
          ROUND(total_spend, 2) as spend,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND is_all_star = TRUE
          AND all_star_rank <= 3
        ORDER BY recommended_stage, all_star_rank
      `;
      break;

    case 'composite':
    default:
      // Balanced Score - Top 3 per stage
      query = `
        SELECT
          'COMPOSITE_OPTIMIZED' as bundle_goal,
          country,
          recommended_stage,
          ad_name,
          current_funnel_stage,
          stage_transition,
          all_star_rank as rank,
          ROUND(roas, 2) as roas,
          total_clicks,
          ROUND(ctr_percent, 1) as ctr_pct,
          ROUND(cpc, 2) as cpc,
          ROUND(total_spend, 2) as spend,
          ROUND(tofu_score, 2) as tofu_score,
          ROUND(mofu_score, 2) as mofu_score,
          ROUND(bofu_score, 2) as bofu_score
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_allstar_ad_bundles_by_country\`
        WHERE country = @country
          AND all_star_rank <= 3
        ORDER BY recommended_stage, all_star_rank
      `;
      break;
  }

  try {
    const [rows] = await bigquery.query({
      query,
      params: { country },
      timeoutMs: 30000,
    });

    return rows.map((row: any) => ({
      bundleGoal: row.bundle_goal,
      country: row.country,
      recommendedStage: row.recommended_stage,
      adName: row.ad_name,
      adsetName: row.adset_name || null,
      currentStage: row.current_funnel_stage,
      stageTransition: row.stage_transition,
      rank: parseInt(row.rank || 0),
      // Funnel scores (always included)
      tofuScore: row.tofu_score ? parseFloat(row.tofu_score) : 0,
      mofuScore: row.mofu_score ? parseFloat(row.mofu_score) : 0,
      bofuScore: row.bofu_score ? parseFloat(row.bofu_score) : 0,
      // Conditional fields based on goal
      clicks: row.total_clicks ? parseInt(row.total_clicks) : undefined,
      cpc: row.cpc ? parseFloat(row.cpc) : undefined,
      ctr: row.ctr_pct ? parseFloat(row.ctr_pct) : undefined,
      spend: row.spend ? parseFloat(row.spend) : undefined,
      roas: row.roas ? parseFloat(row.roas) : undefined,
      revenue: row.revenue ? parseFloat(row.revenue) : undefined,
      purchases: row.total_purchases ? parseInt(row.total_purchases) : undefined,
      conversionRate: row.conv_rate_pct ? parseFloat(row.conv_rate_pct) : undefined,
      cpa: row.cpa ? parseFloat(row.cpa) : undefined,
    }));
  } catch (error) {
    console.error(`Error fetching ${goal} all-star bundles for ${country}:`, error);
    return [];
  }
}

// Get audience overlap analysis
export async function getAudienceOverlapAnalysis(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      analysis_type,
      segment,
      segment_size,
      facebook_spend,
      google_spend,
      combined_spend,
      facebook_revenue,
      google_revenue,
      combined_revenue,
      facebook_roas,
      google_roas,
      combined_roas,
      spend_correlation,
      revenue_correlation,
      engagement_correlation,
      facebook_ctr,
      google_ctr,
      overlap_efficiency,
      strategic_recommendation,
      market_opportunity_score
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_audience_overlap_analysis\`
    ORDER BY analysis_type, segment
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      analysisType: row.analysis_type,
      segment: row.segment,
      segmentSize: parseInt(row.segment_size || 0),
      facebookSpend: parseFloat(row.facebook_spend || 0),
      googleSpend: parseFloat(row.google_spend || 0),
      combinedSpend: parseFloat(row.combined_spend || 0),
      facebookRevenue: parseFloat(row.facebook_revenue || 0),
      googleRevenue: parseFloat(row.google_revenue || 0),
      combinedRevenue: parseFloat(row.combined_revenue || 0),
      facebookRoas: parseFloat(row.facebook_roas || 0),
      googleRoas: parseFloat(row.google_roas || 0),
      combinedRoas: parseFloat(row.combined_roas || 0),
      spendCorrelation: parseFloat(row.spend_correlation || 0),
      revenueCorrelation: parseFloat(row.revenue_correlation || 0),
      engagementCorrelation: parseFloat(row.engagement_correlation || 0),
      facebookCtr: parseFloat(row.facebook_ctr || 0),
      googleCtr: parseFloat(row.google_ctr || 0),
      overlapEfficiency: row.overlap_efficiency,
      strategicRecommendation: row.strategic_recommendation,
      marketOpportunityScore: parseFloat(row.market_opportunity_score || 0)
    }));
  } catch (error) {
    console.error('Error fetching audience overlap analysis:', error);
    return [];
  }
}

// Get putter grip pricing model
export async function getPutterGripPricingModel(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      title,
      current_positioning,
      current_units_sold,
      current_revenue,
      current_avg_price,
      price_change_pct,
      demand_change_pct,
      projected_units_elastic,
      revenue_with_elasticity,
      revenue_change_with_elasticity,
      revenue_change_pct,
      unit_change_pct,
      risk_category,
      recommendation
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_putter_grip_pricing_model\`
    ORDER BY ABS(revenue_change_with_elasticity) DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      title: row.title,
      currentPositioning: row.current_positioning,
      currentUnitsSold: parseInt(row.current_units_sold || 0),
      currentRevenue: parseFloat(row.current_revenue || 0),
      currentAvgPrice: parseFloat(row.current_avg_price || 0),
      priceChangePct: parseFloat(row.price_change_pct || 0),
      demandChangePct: parseFloat(row.demand_change_pct || 0),
      projectedUnitsElastic: parseFloat(row.projected_units_elastic || 0),
      revenueWithElasticity: parseFloat(row.revenue_with_elasticity || 0),
      revenueChangeWithElasticity: parseFloat(row.revenue_change_with_elasticity || 0),
      revenueChangePct: parseFloat(row.revenue_change_pct || 0),
      unitChangePct: parseFloat(row.unit_change_pct || 0),
      riskCategory: row.risk_category,
      recommendation: row.recommendation
    }));
  } catch (error) {
    console.error('Error fetching putter grip pricing model:', error);
    return [];
  }
}

// Get swing grip pricing model
export async function getSwingGripPricingModel(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      product_line,
      title,
      total_individual_units,
      current_revenue,
      current_unit_price,
      price_change_pct,
      demand_change_pct,
      projected_units_elastic,
      revenue_with_elasticity,
      revenue_change_with_elasticity,
      revenue_impact_pct,
      unit_volume_change_pct,
      price_direction,
      revenue_impact_category,
      recommendation
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_swing_grip_pricing_model\`
    ORDER BY ABS(revenue_change_with_elasticity) DESC
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      productLine: row.product_line,
      title: row.title,
      totalIndividualUnits: parseInt(row.total_individual_units || 0),
      currentRevenue: parseFloat(row.current_revenue || 0),
      currentUnitPrice: parseFloat(row.current_unit_price || 0),
      priceChangePct: parseFloat(row.price_change_pct || 0),
      demandChangePct: parseFloat(row.demand_change_pct || 0),
      projectedUnitsElastic: parseFloat(row.projected_units_elastic || 0),
      revenueWithElasticity: parseFloat(row.revenue_with_elasticity || 0),
      revenueChangeWithElasticity: parseFloat(row.revenue_change_with_elasticity || 0),
      revenueImpactPct: parseFloat(row.revenue_impact_pct || 0),
      unitVolumeChangePct: parseFloat(row.unit_volume_change_pct || 0),
      priceDirection: row.price_direction,
      revenueImpactCategory: row.revenue_impact_category,
      recommendation: row.recommendation
    }));
  } catch (error) {
    console.error('Error fetching swing grip pricing model:', error);
    return [];
  }
}

// Get product affinity data
export async function getProductAffinity(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      product_a_title,
      product_b_title,
      co_purchase_count,
      bundle_price,
      affinity_rank_for_product_a,
      overall_affinity_rank
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.product_affinity\`
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
export async function getGeographicProductPerformance(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    WITH state_totals AS (
      SELECT
        state_province,
        SUM(revenue_30d) as total_revenue,
        SUM(units_sold_30d) as total_units
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_product_performance\`
      WHERE state_province IS NOT NULL AND country_code = 'US'
      GROUP BY state_province
    ),
    state_top_products AS (
      SELECT
        state_province,
        product_title,
        SUM(revenue_30d) as product_revenue,
        ROW_NUMBER() OVER (PARTITION BY state_province ORDER BY SUM(revenue_30d) DESC) as rn
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.geographic_product_performance\`
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
export async function getShopifyRevenueYoY(clientId: string, days: number = 30): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    WITH current_period AS (
      SELECT
        date,
        revenue,
        orders
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.daily_business_metrics\`
      WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND date < CURRENT_DATE()
    ),
    previous_year AS (
      SELECT
        DATE_ADD(date, INTERVAL 1 YEAR) as date,
        revenue as revenue_ly,
        orders as orders_ly
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.daily_business_metrics\`
      WHERE date >= DATE_SUB(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR), INTERVAL ${days} DAY)
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

// =============================================================================
// DEPRECATED: Legacy module-level caching
// These variables and functions are DEPRECATED and should NOT be used.
// They exist only for backwards compatibility during migration.
// All new code should pass clientId explicitly through function parameters.
// The x-client-id header should be the source of truth for request isolation.
// =============================================================================

/** @deprecated Use explicit clientId parameter instead */
let cachedCurrentClientIdForBQ: string | null = null;

/** @deprecated Use explicit clientId parameter instead */
let hasInitialized: boolean = false;

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export async function getCurrentClientId(): Promise<string> {
  // Check cache first
  if (cachedCurrentClientIdForBQ) {
    console.log('[BigQuery] Using cached client ID:', cachedCurrentClientIdForBQ);
    return cachedCurrentClientIdForBQ;
  }

  try {
    const query = `
      SELECT client_id
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.admin_configs.current_client_setting\`
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const [rows] = await bigquery.query({
      query,
      timeoutMs: 10000,
    });

    if (rows.length > 0) {
      console.log('[BigQuery] Current client from DB:', rows[0].client_id);
      cachedCurrentClientIdForBQ = rows[0].client_id;

      // Also populate the client-config cache
      const { setCachedClientId } = await import('./client-config');
      setCachedClientId(rows[0].client_id);

      return cachedCurrentClientIdForBQ;
    }
  } catch (error) {
    console.error('[BigQuery] Error fetching current client:', error);
    throw new Error('No client selected. Please select a client from the admin panel.');
  }

  // No fallback - throw error if no client is set
  throw new Error('No client selected. Please select a client from the admin panel.');
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export async function initializeCurrentClient(requestedClientId?: string): Promise<void> {
  // If a specific client is requested, always reinitialize to that client
  if (requestedClientId) {
    console.log('[BigQuery] Reinitializing to requested client:', requestedClientId);
    cachedCurrentClientIdForBQ = requestedClientId;
    hasInitialized = true;

    // Also update client-config cache
    const { setCachedClientId } = await import('./client-config');
    setCachedClientId(requestedClientId);
    return;
  }

  // Otherwise, only initialize once per function instance
  if (!hasInitialized) {
    await getCurrentClientId();
    hasInitialized = true;
    console.log('[BigQuery] Client initialized for this function instance');
  }
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function clearBigQueryClientCache() {
  cachedCurrentClientIdForBQ = null;
  hasInitialized = false; // Reset so next request re-initializes
  console.log('[BigQuery] Cache cleared');
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function setBigQueryClientCache(clientId: string) {
  cachedCurrentClientIdForBQ = clientId;
  console.log('[BigQuery] Cache set directly to:', clientId);
}

// Get client dashboard configuration
export async function getClientDashboardConfig(clientId: string): Promise<any> {
  console.log('[BigQuery] Fetching dashboard config for client:', clientId);

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
      const config = JSON.parse(rows[0].dashboard_config);
      console.log('[BigQuery] Dashboard config for', clientId, ':', config);
      return config;
    }
    console.log('[BigQuery] No dashboard config found for client:', clientId);
    return null;
  } catch (error) {
    console.error('Error fetching client dashboard config:', error);
    return null;
  }
}

// Get executive summary data for dashboard
export async function getExecutiveSummary(clientId: string): Promise<ExecutiveSummary | null> {
  const datasetName = getDatasetName(clientId);
  // Determine which clients have Klaviyo
  const hasKlaviyo = clientId !== 'hb' && clientId !== 'benhogan';

  // Build Klaviyo fields conditionally
  const klaviyoFields = hasKlaviyo ? `
      klaviyo_total_revenue_mtd,
      klaviyo_total_revenue_lm,
      klaviyo_total_revenue_7d,
      klaviyo_total_revenue_30d,
      klaviyo_total_revenue_ytd,
      klaviyo_total_revenue_mtd_yoy_growth_pct,
      klaviyo_total_revenue_lm_yoy_growth_pct,
      klaviyo_total_revenue_7d_yoy_growth_pct,
      klaviyo_total_revenue_30d_yoy_growth_pct,
      klaviyo_total_revenue_ytd_yoy_growth_pct,
      klaviyo_revenue_per_send_mtd,
      klaviyo_revenue_per_send_7d,
      klaviyo_revenue_per_send_30d,` : `
      0 as klaviyo_total_revenue_mtd,
      0 as klaviyo_total_revenue_lm,
      0 as klaviyo_total_revenue_7d,
      0 as klaviyo_total_revenue_30d,
      0 as klaviyo_total_revenue_ytd,
      0 as klaviyo_total_revenue_mtd_yoy_growth_pct,
      0 as klaviyo_total_revenue_lm_yoy_growth_pct,
      0 as klaviyo_total_revenue_7d_yoy_growth_pct,
      0 as klaviyo_total_revenue_30d_yoy_growth_pct,
      0 as klaviyo_total_revenue_ytd_yoy_growth_pct,
      0 as klaviyo_revenue_per_send_mtd,
      0 as klaviyo_revenue_per_send_7d,
      0 as klaviyo_revenue_per_send_30d,`;

  const query = `
    SELECT
      revenue_mtd,
      revenue_mtd_yoy_growth_pct,
      revenue_lm,
      revenue_lm_yoy_growth_pct,
      revenue_7d,
      revenue_7d_yoy_growth_pct,
      revenue_30d,
      revenue_30d_yoy_growth_pct,
      revenue_ytd,
      revenue_ytd_yoy_growth_pct,
      blended_roas_mtd,
      blended_roas_mtd_yoy_growth_pct,
      blended_roas_lm,
      blended_roas_lm_yoy_growth_pct,
      blended_roas_7d,
      blended_roas_7d_yoy_growth_pct,
      blended_roas_30d,
      blended_roas_30d_yoy_growth_pct,
      blended_roas_ytd,
      blended_roas_ytd_yoy_growth_pct,
      blended_spend_mtd,
      blended_spend_lm,
      blended_spend_7d,
      blended_spend_30d,
      blended_spend_ytd,
      blended_spend_lm_yoy,
      SAFE_DIVIDE((blended_spend_lm - blended_spend_lm_yoy), blended_spend_lm_yoy) * 100 as blended_spend_lm_yoy_growth_pct,
      blended_spend_mtd_yoy,
      blended_spend_7d_yoy,
      blended_spend_30d_yoy,
      blended_spend_ytd_yoy,
      SAFE_DIVIDE((blended_spend_mtd - blended_spend_mtd_yoy), blended_spend_mtd_yoy) * 100 as blended_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((blended_spend_7d - blended_spend_7d_yoy), blended_spend_7d_yoy) * 100 as blended_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((blended_spend_30d - blended_spend_30d_yoy), blended_spend_30d_yoy) * 100 as blended_spend_30d_yoy_growth_pct,
      SAFE_DIVIDE((blended_spend_ytd - blended_spend_ytd_yoy), blended_spend_ytd_yoy) * 100 as blended_spend_ytd_yoy_growth_pct,
      ${klaviyoFields}
      google_spend_mtd,
      google_spend_lm,
      google_spend_7d,
      google_spend_30d,
      google_spend_ytd,
      google_revenue_mtd,
      google_revenue_lm,
      google_revenue_7d,
      google_revenue_30d,
      google_revenue_ytd,
      google_roas_mtd,
      google_roas_lm,
      google_roas_7d,
      google_roas_30d,
      google_roas_ytd,
      google_roas_mtd_yoy_growth_pct,
      google_roas_lm_yoy_growth_pct,
      google_roas_7d_yoy_growth_pct,
      google_roas_30d_yoy_growth_pct,
      google_roas_ytd_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_mtd - google_spend_mtd_yoy), google_spend_mtd_yoy) * 100 as google_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_lm - google_spend_lm_yoy), google_spend_lm_yoy) * 100 as google_spend_lm_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_7d - google_spend_7d_yoy), google_spend_7d_yoy) * 100 as google_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_30d - google_spend_30d_yoy), google_spend_30d_yoy) * 100 as google_spend_30d_yoy_growth_pct,
      SAFE_DIVIDE((google_spend_ytd - google_spend_ytd_yoy), google_spend_ytd_yoy) * 100 as google_spend_ytd_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_mtd - google_revenue_mtd_yoy), google_revenue_mtd_yoy) * 100 as google_revenue_mtd_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_lm - google_revenue_lm_yoy), google_revenue_lm_yoy) * 100 as google_revenue_lm_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_7d - google_revenue_7d_yoy), google_revenue_7d_yoy) * 100 as google_revenue_7d_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_30d - google_revenue_30d_yoy), google_revenue_30d_yoy) * 100 as google_revenue_30d_yoy_growth_pct,
      SAFE_DIVIDE((google_revenue_ytd - google_revenue_ytd_yoy), google_revenue_ytd_yoy) * 100 as google_revenue_ytd_yoy_growth_pct,
      facebook_spend_mtd,
      facebook_spend_lm,
      facebook_spend_7d,
      facebook_spend_30d,
      facebook_spend_ytd,
      facebook_revenue_mtd,
      facebook_revenue_lm,
      facebook_revenue_7d,
      facebook_revenue_30d,
      facebook_revenue_ytd,
      facebook_roas_mtd,
      facebook_roas_lm,
      facebook_roas_7d,
      facebook_roas_30d,
      facebook_roas_ytd,
      facebook_roas_mtd_yoy_growth_pct,
      facebook_roas_lm_yoy_growth_pct,
      facebook_roas_7d_yoy_growth_pct,
      facebook_roas_30d_yoy_growth_pct,
      facebook_roas_ytd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_mtd - facebook_spend_mtd_yoy), facebook_spend_mtd_yoy) * 100 as facebook_spend_mtd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_lm - facebook_spend_lm_yoy), facebook_spend_lm_yoy) * 100 as facebook_spend_lm_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_7d - facebook_spend_7d_yoy), facebook_spend_7d_yoy) * 100 as facebook_spend_7d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_30d - facebook_spend_30d_yoy), facebook_spend_30d_yoy) * 100 as facebook_spend_30d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_spend_ytd - facebook_spend_ytd_yoy), facebook_spend_ytd_yoy) * 100 as facebook_spend_ytd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_mtd - facebook_revenue_mtd_yoy), facebook_revenue_mtd_yoy) * 100 as facebook_revenue_mtd_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_lm - facebook_revenue_lm_yoy), facebook_revenue_lm_yoy) * 100 as facebook_revenue_lm_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_7d - facebook_revenue_7d_yoy), facebook_revenue_7d_yoy) * 100 as facebook_revenue_7d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_30d - facebook_revenue_30d_yoy), facebook_revenue_30d_yoy) * 100 as facebook_revenue_30d_yoy_growth_pct,
      SAFE_DIVIDE((facebook_revenue_ytd - facebook_revenue_ytd_yoy), facebook_revenue_ytd_yoy) * 100 as facebook_revenue_ytd_yoy_growth_pct
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_executive_summary\`
    ORDER BY report_date DESC
    LIMIT 1
  `;

  console.log('[getExecutiveSummary] Querying dataset:', datasetName);
  console.log('[getExecutiveSummary] Full table reference:', `${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_executive_summary`);

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    console.log('[getExecutiveSummary] Query succeeded, rows:', rows.length);
    return rows.length > 0 ? (rows[0] as ExecutiveSummary) : null;
  } catch (error) {
    console.error('[getExecutiveSummary] Error querying dataset:', datasetName, error);
    throw error;
  }
}

// Get business context index for health metrics
export async function getBusinessContextIndex(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      business_health_index,
      revenue_trend,
      demand_trend,
      yoy_status,
      revenue_yoy_change_pct,
      orders_yoy_change_pct,
      search_demand_yoy_change_pct,
      daily_search_impressions,
      search_impressions_7d_avg,
      daily_brand_impressions,
      brand_impressions_30d_avg,
      revenue_7d_avg,
      revenue_30d_avg
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_business_context_index\`
    ORDER BY date DESC
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      businessHealthIndex: parseFloat(row.business_health_index || 0),
      revenueTrend: row.revenue_trend,
      demandTrend: row.demand_trend,
      yoyStatus: row.yoy_status,
      revenueYoyChangePct: parseFloat(row.revenue_yoy_change_pct || 0),
      ordersYoyChangePct: parseFloat(row.orders_yoy_change_pct || 0),
      searchDemandYoyChangePct: parseFloat(row.search_demand_yoy_change_pct || 0),
      dailySearchImpressions: parseInt(row.daily_search_impressions || 0),
      searchImpressions7dAvg: parseFloat(row.search_impressions_7d_avg || 0),
      dailyBrandImpressions: parseInt(row.daily_brand_impressions || 0),
      brandImpressions30dAvg: parseFloat(row.brand_impressions_30d_avg || 0),
      revenue7dAvg: parseFloat(row.revenue_7d_avg || 0),
      revenue30dAvg: parseFloat(row.revenue_30d_avg || 0)
    };
  } catch (error) {
    console.error('Error fetching business context index:', error);
    return null;
  }
}

// Get Bayesian probability forecast for budget pacing
export async function getBayesianForecast(clientId: string): Promise<any> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      month_start,
      report_date,
      month_label,
      days_elapsed,
      days_remaining,
      monthly_revenue_target,
      monthly_roas_target,
      mtd_revenue,
      mtd_spend,
      mtd_actual_roas,
      revenue_gap,
      current_attainment_pct,
      probability_hit_revenue_target,
      probability_hit_roas_target,
      probability_hit_both_targets,
      p10_revenue,
      p50_revenue,
      p90_revenue,
      p10_roas,
      p50_roas,
      p90_roas,
      revenue_risk_level,
      roas_risk_level,
      performance_ratio,
      performance_vs_expected_pct,
      historical_revenue_success_rate,
      historical_roas_success_rate,
      num_simulations,
      calculated_at
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.bayesian_probability_forecast\`
    WHERE report_date = CURRENT_DATE()
    LIMIT 1
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      monthStart: row.month_start,
      reportDate: row.report_date,
      monthLabel: row.month_label,
      daysElapsed: parseInt(row.days_elapsed || 0),
      daysRemaining: parseInt(row.days_remaining || 0),
      monthlyRevenueTarget: parseFloat(row.monthly_revenue_target || 0),
      monthlyRoasTarget: parseFloat(row.monthly_roas_target || 0),
      mtdRevenue: parseFloat(row.mtd_revenue || 0),
      mtdSpend: parseFloat(row.mtd_spend || 0),
      mtdActualRoas: parseFloat(row.mtd_actual_roas || 0),
      revenueGap: parseFloat(row.revenue_gap || 0),
      currentAttainmentPct: parseFloat(row.current_attainment_pct || 0),
      probabilityHitRevenueTarget: parseFloat(row.probability_hit_revenue_target || 0),
      probabilityHitRoasTarget: parseFloat(row.probability_hit_roas_target || 0),
      probabilityHitBothTargets: parseFloat(row.probability_hit_both_targets || 0),
      p10Revenue: parseFloat(row.p10_revenue || 0),
      p50Revenue: parseFloat(row.p50_revenue || 0),
      p90Revenue: parseFloat(row.p90_revenue || 0),
      p10Roas: parseFloat(row.p10_roas || 0),
      p50Roas: parseFloat(row.p50_roas || 0),
      p90Roas: parseFloat(row.p90_roas || 0),
      revenueRiskLevel: row.revenue_risk_level,
      roasRiskLevel: row.roas_risk_level,
      performanceRatio: parseFloat(row.performance_ratio || 0),
      performanceVsExpectedPct: parseFloat(row.performance_vs_expected_pct || 0),
      historicalRevenueSuccessRate: parseFloat(row.historical_revenue_success_rate || 0),
      historicalRoasSuccessRate: parseFloat(row.historical_roas_success_rate || 0),
      numSimulations: parseInt(row.num_simulations || 0),
      calculatedAt: row.calculated_at
    };
  } catch (error) {
    console.error('Error fetching Bayesian forecast:', error);
    return null;
  }
}

// Get forecast scenarios from prophet summary
export async function getForecastScenarios(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      period,
      start_date,
      end_date,
      days,
      conservative_total,
      forecast_total,
      optimistic_total,
      stretch_goal_total,
      conservative_avg,
      forecast_avg,
      optimistic_avg,
      stretch_goal_avg
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_forecast_prophet_summary\`
    ORDER BY start_date
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      period: row.period,
      startDate: row.start_date.value,
      endDate: row.end_date.value,
      days: row.days,
      scenarios: {
        conservative: {
          total: parseFloat(row.conservative_total || 0),
          avg: parseFloat(row.conservative_avg || 0)
        },
        forecast: {
          total: parseFloat(row.forecast_total || 0),
          avg: parseFloat(row.forecast_avg || 0)
        },
        optimistic: {
          total: parseFloat(row.optimistic_total || 0),
          avg: parseFloat(row.optimistic_avg || 0)
        },
        stretchGoal: {
          total: parseFloat(row.stretch_goal_total || 0),
          avg: parseFloat(row.stretch_goal_avg || 0)
        }
      }
    }));
  } catch (error) {
    console.error('Error fetching forecast scenarios:', error);
    throw error;
  }
}

// Get forecast daily data for chart
export async function getForecastDaily(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      forecast_date,
      forecast,
      conservative,
      optimistic,
      stretch_goal
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.ai_forecast_prophet_daily\`
    ORDER BY forecast_date
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      date: row.forecast_date.value,
      forecast: parseFloat(row.forecast || 0),
      conservative: parseFloat(row.conservative || 0),
      optimistic: parseFloat(row.optimistic || 0),
      stretchGoal: parseFloat(row.stretch_goal || 0)
    }));
  } catch (error) {
    console.error('Error fetching forecast daily:', error);
    throw error;
  }
}

// Get actual revenue data for Q4 2025 to overlay with forecast
export async function getForecastActuals(clientId: string): Promise<any[]> {
  const datasetName = getDatasetName(clientId);
  const query = `
    SELECT
      date,
      revenue as actual
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.daily_business_metrics\`
    WHERE date >= '2025-10-01' AND date <= '2025-12-31'
    ORDER BY date
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    return rows.map(row => ({
      date: row.date.value,
      actual: parseFloat(row.actual || 0)
    }));
  } catch (error) {
    console.error('Error fetching forecast actuals:', error);
    throw error;
  }
}
// Ad Performance Details
export async function getAdPerformance(clientId: string, adName: string, adsetName: string, preset: string = 'last-30-days') {
  const datasetName = getDatasetName(clientId);
  console.log(`[getAdPerformance] Fetching performance for ad: ${adName}, adset: ${adsetName}, preset: ${preset}`);

  const filters = getPaidMediaDateFilterSQL(preset, undefined, undefined, 'previous-period');

  const whereClause = `platform = 'Facebook' AND ad_name = @ad_name AND adset_name = @adset_name AND ${filters.dateFilter}`;
  const prevWhereClause = `platform = 'Facebook' AND ad_name = @ad_name AND adset_name = @adset_name AND ${filters.prevDateFilter}`;

  const summaryQuery = `
    WITH current_period AS (
      SELECT
        ad_name,
        campaign_name,
        adset_name,
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(purchases) as total_purchases,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100 as ctr,
        SAFE_DIVIDE(SUM(spend), SUM(purchases)) as cpa,
        SAFE_DIVIDE(SUM(spend), SUM(clicks)) as cpc,
        SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000 as cpm,
        SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100 as conversion_rate,
        SAFE_DIVIDE(SUM(revenue), SUM(purchases)) as avg_order_value,
        -- Funnel intelligence fields (take most recent non-null values)
        ARRAY_AGG(current_funnel_stage IGNORE NULLS ORDER BY date DESC LIMIT 1)[SAFE_OFFSET(0)] as current_funnel_stage,
        ARRAY_AGG(inferred_funnel_stage IGNORE NULLS ORDER BY date DESC LIMIT 1)[SAFE_OFFSET(0)] as inferred_funnel_stage,
        ARRAY_AGG(is_misclassified IGNORE NULLS ORDER BY date DESC LIMIT 1)[SAFE_OFFSET(0)] as is_misclassified,
        AVG(tofu_score) as tofu_score,
        AVG(mofu_score) as mofu_score,
        AVG(bofu_score) as bofu_score
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE ${whereClause}
      GROUP BY ad_name, campaign_name, adset_name
    ),
    previous_period AS (
      SELECT
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
        SUM(purchases) as total_purchases,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100 as ctr,
        SAFE_DIVIDE(SUM(spend), SUM(purchases)) as cpa,
        SAFE_DIVIDE(SUM(spend), SUM(clicks)) as cpc,
        SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000 as cpm,
        SAFE_DIVIDE(SUM(purchases), SUM(clicks)) * 100 as conversion_rate,
        SAFE_DIVIDE(SUM(revenue), SUM(purchases)) as avg_order_value
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
      WHERE ${prevWhereClause}
    )
    SELECT
      cp.*,
      pp.total_spend as prev_total_spend,
      pp.total_revenue as prev_total_revenue,
      pp.roas as prev_roas,
      pp.total_purchases as prev_total_purchases,
      pp.total_impressions as prev_total_impressions,
      pp.total_clicks as prev_total_clicks,
      pp.ctr as prev_ctr,
      pp.cpa as prev_cpa,
      pp.cpc as prev_cpc,
      pp.cpm as prev_cpm,
      pp.conversion_rate as prev_conversion_rate,
      pp.avg_order_value as prev_avg_order_value
    FROM current_period cp
    CROSS JOIN previous_period pp
  `;

  const timeseriesQuery = `
    SELECT
      date,
      SUM(spend) as spend,
      SUM(revenue) as revenue,
      SAFE_DIVIDE(SUM(revenue), SUM(spend)) as roas,
      SUM(purchases) as purchases
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.paid_media_performance\`
    WHERE ${whereClause}
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const params = {
      ad_name: adName,
      adset_name: adsetName
    };

    console.log(`[getAdPerformance] Query params:`, params);
    console.log(`[getAdPerformance] Dataset: ${datasetName}`);
    console.log(`[getAdPerformance] Date filter: ${filters.dateFilter}`);

    const [summaryRows] = await bigquery.query({
      query: summaryQuery,
      params,
      timeoutMs: 30000,
    });

    console.log(`[getAdPerformance] Summary rows returned: ${summaryRows.length}`);

    const [timeseriesRows] = await bigquery.query({
      query: timeseriesQuery,
      params,
      timeoutMs: 30000,
    });

    console.log(`[getAdPerformance] Timeseries rows returned: ${timeseriesRows.length}`);

    if (summaryRows.length === 0) {
      console.log(`[getAdPerformance] No data found for ad: ${adName}`);
      throw new Error('Ad not found');
    }

    const summary = summaryRows[0];

    const calculateChange = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      summary: {
        adName: summary.ad_name,
        campaignName: summary.campaign_name,
        adsetName: summary.adset_name,
        totalSpend: parseFloat(summary.total_spend || 0),
        totalRevenue: parseFloat(summary.total_revenue || 0),
        roas: parseFloat(summary.roas || 0),
        totalPurchases: parseInt(summary.total_purchases || 0),
        totalImpressions: parseInt(summary.total_impressions || 0),
        totalClicks: parseInt(summary.total_clicks || 0),
        ctr: parseFloat(summary.ctr || 0),
        cpa: parseFloat(summary.cpa || 0),
        cpc: parseFloat(summary.cpc || 0),
        cpm: parseFloat(summary.cpm || 0),
        conversionRate: parseFloat(summary.conversion_rate || 0),
        avgOrderValue: parseFloat(summary.avg_order_value || 0),
        // Previous period values
        prevTotalSpend: parseFloat(summary.prev_total_spend || 0),
        prevTotalRevenue: parseFloat(summary.prev_total_revenue || 0),
        prevRoas: parseFloat(summary.prev_roas || 0),
        prevTotalPurchases: parseInt(summary.prev_total_purchases || 0),
        prevTotalImpressions: parseInt(summary.prev_total_impressions || 0),
        prevTotalClicks: parseInt(summary.prev_total_clicks || 0),
        prevCtr: parseFloat(summary.prev_ctr || 0),
        prevCpa: parseFloat(summary.prev_cpa || 0),
        prevCpc: parseFloat(summary.prev_cpc || 0),
        prevCpm: parseFloat(summary.prev_cpm || 0),
        prevConversionRate: parseFloat(summary.prev_conversion_rate || 0),
        prevAvgOrderValue: parseFloat(summary.prev_avg_order_value || 0),
        // Percentage changes
        spendChange: calculateChange(parseFloat(summary.total_spend || 0), parseFloat(summary.prev_total_spend || 0)),
        revenueChange: calculateChange(parseFloat(summary.total_revenue || 0), parseFloat(summary.prev_total_revenue || 0)),
        roasChange: calculateChange(parseFloat(summary.roas || 0), parseFloat(summary.prev_roas || 0)),
        purchasesChange: calculateChange(parseInt(summary.total_purchases || 0), parseInt(summary.prev_total_purchases || 0)),
        impressionsChange: calculateChange(parseInt(summary.total_impressions || 0), parseInt(summary.prev_total_impressions || 0)),
        clicksChange: calculateChange(parseInt(summary.total_clicks || 0), parseInt(summary.prev_total_clicks || 0)),
        ctrChange: calculateChange(parseFloat(summary.ctr || 0), parseFloat(summary.prev_ctr || 0)),
        cpaChange: calculateChange(parseFloat(summary.cpa || 0), parseFloat(summary.prev_cpa || 0)),
        cpcChange: calculateChange(parseFloat(summary.cpc || 0), parseFloat(summary.prev_cpc || 0)),
        cpmChange: calculateChange(parseFloat(summary.cpm || 0), parseFloat(summary.prev_cpm || 0)),
        conversionRateChange: calculateChange(parseFloat(summary.conversion_rate || 0), parseFloat(summary.prev_conversion_rate || 0)),
        avgOrderValueChange: calculateChange(parseFloat(summary.avg_order_value || 0), parseFloat(summary.prev_avg_order_value || 0))
      },
      timeseries: timeseriesRows.map(row => ({
        date: row.date?.value || row.date,
        spend: parseFloat(row.spend || 0),
        revenue: parseFloat(row.revenue || 0),
        roas: parseFloat(row.roas || 0),
        purchases: parseInt(row.purchases || 0)
      }))
    };
  } catch (error) {
    console.error('Error fetching ad performance:', error);
    throw error;
  }
}

// Organic Social Data
export async function getOrganicSocialData(clientId: string, platform: string = 'all', period: string = '30d', comparison: string = 'previous-period'): Promise<any> {
  try {
    const dataset = getDatasetName(clientId);

    // Build platform filter
    let platformFilter = '';
    if (platform !== 'all') {
      platformFilter = `AND LOWER(platform) = LOWER('${platform}')`;
    }

    // Calculate period days
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    // Build query that gets current and comparison periods
    const query = `
      WITH current_period AS (
        SELECT
          metric_date,
          platform,
          total_followers,
          followers_gained,
          followers_lost,
          impressions,
          engagements,
          engagement_rate_pct
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${dataset}.daily_organic_social_performance\`
        WHERE metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${periodDays} DAY)
          ${platformFilter}
      ),
      previous_period AS (
        SELECT
          metric_date,
          platform,
          total_followers,
          followers_gained,
          followers_lost,
          impressions,
          engagements,
          engagement_rate_pct
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${dataset}.daily_organic_social_performance\`
        WHERE metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${comparison === 'previous-year' ? `${periodDays} + 365` : `${periodDays * 2}`} DAY)
          AND metric_date < DATE_SUB(CURRENT_DATE(), INTERVAL ${comparison === 'previous-year' ? '365' : periodDays} DAY)
          ${platformFilter}
      ),
      current_metrics AS (
        SELECT
          AVG(engagement_rate_pct) as avg_engagement_rate,
          SUM(impressions) as total_impressions,
          SUM(followers_gained) as total_followers_gained
        FROM current_period
      ),
      previous_metrics AS (
        SELECT
          AVG(engagement_rate_pct) as avg_engagement_rate,
          SUM(impressions) as total_impressions,
          SUM(followers_gained) as total_followers_gained
        FROM previous_period
      ),
      current_followers AS (
        SELECT
          platform,
          total_followers,
          ROW_NUMBER() OVER (PARTITION BY platform ORDER BY metric_date DESC) as rn
        FROM current_period
      ),
      previous_followers AS (
        SELECT
          platform,
          total_followers,
          ROW_NUMBER() OVER (PARTITION BY platform ORDER BY metric_date DESC) as rn
        FROM previous_period
      )
      SELECT
        -- Current period KPIs
        cm.avg_engagement_rate as current_engagement_rate,
        cm.total_impressions as current_impressions,
        cm.total_followers_gained as current_followers_gained,
        (SELECT SUM(total_followers) FROM current_followers WHERE rn = 1) as current_total_followers,

        -- Previous period KPIs
        pm.avg_engagement_rate as previous_engagement_rate,
        pm.total_impressions as previous_impressions,
        pm.total_followers_gained as previous_followers_gained,
        (SELECT SUM(total_followers) FROM previous_followers WHERE rn = 1) as previous_total_followers,

        -- Percentage changes
        SAFE_DIVIDE((cm.avg_engagement_rate - pm.avg_engagement_rate), pm.avg_engagement_rate) * 100 as engagement_rate_change,
        SAFE_DIVIDE((cm.total_impressions - pm.total_impressions), pm.total_impressions) * 100 as impressions_change,
        SAFE_DIVIDE((cm.total_followers_gained - pm.total_followers_gained), pm.total_followers_gained) * 100 as followers_gained_change,
        SAFE_DIVIDE(
          ((SELECT SUM(total_followers) FROM current_followers WHERE rn = 1) - (SELECT SUM(total_followers) FROM previous_followers WHERE rn = 1)),
          (SELECT SUM(total_followers) FROM previous_followers WHERE rn = 1)
        ) * 100 as total_followers_change

      FROM current_metrics cm, previous_metrics pm
    `;

    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    // Also get time series data for charting
    // When platform is 'all', sum followers across platforms for each date
    // Exclude today's data as it's incomplete
    const timeSeriesQuery = platform === 'all' ? `
      SELECT
        metric_date,
        SUM(total_followers) as total_followers
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${dataset}.daily_organic_social_performance\`
      WHERE metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${periodDays} DAY)
        AND metric_date < CURRENT_DATE()
      GROUP BY metric_date
      ORDER BY metric_date ASC
    ` : `
      SELECT
        metric_date,
        total_followers
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${dataset}.daily_organic_social_performance\`
      WHERE metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${periodDays} DAY)
        AND metric_date < CURRENT_DATE()
        ${platformFilter}
      ORDER BY metric_date ASC
    `;

    const [timeSeriesRows] = await bigquery.query({
      query: timeSeriesQuery,
      timeoutMs: 30000,
    });

    console.log('[Organic Social] KPI data:', rows[0]);
    console.log('[Organic Social] Time series rows count:', timeSeriesRows.length);
    console.log('[Organic Social] First time series row:', timeSeriesRows[0]);

    // Convert date objects to strings for the chart
    const formattedTimeSeries = timeSeriesRows.map((row: any) => ({
      ...row,
      metric_date: row.metric_date?.value || row.metric_date
    }));

    return {
      kpis: rows[0] || {},
      timeSeries: formattedTimeSeries
    };
  } catch (error) {
    console.error('Error fetching organic social data:', error);
    if (error instanceof Error && error.message.includes('Not found')) {
      throw new Error('Organic social data not available for this client');
    }
    throw error;
  }
}

// ============================================================================
// Business Context Retrieval for Reports
// ============================================================================

import {
  CATEGORY_CONFIG,
  getTailDays,
  getBufferDays,
  isAlwaysIncluded,
  isPersistent,
} from './context-config';

export interface ReportPeriod {
  reportStart: string; // YYYY-MM-DD
  reportEnd: string;   // YYYY-MM-DD
  includeComparison?: boolean;
  comparisonStart?: string; // YYYY-MM-DD (typically YoY)
  comparisonEnd?: string;   // YYYY-MM-DD
}

export interface ContextEntry {
  id: string;
  client_id: string;
  category: string;
  title: string;
  description: string;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  magnitude: string | null;
  comparison_significant: boolean;
  superseded_by: string | null;
  source: string;
  source_document: string | null;
}

export interface RelevantContext {
  direct: ContextEntry[];      // Context affecting the report period
  comparison: ContextEntry[];  // Context affecting the comparison period (for YoY explanations)
  alwaysOn: ContextEntry[];    // Brand details, active standing conditions
}

/**
 * Get relevant business context for a report period.
 *
 * This function retrieves context entries that are relevant to:
 * 1. Direct period: Events/conditions that affect the report period
 * 2. Comparison period: Events (with comparison_significant=true) that explain YoY differences
 * 3. Always-on: Brand details and active standing conditions
 *
 * The retrieval logic respects:
 * - Tail days for point-in-time events (e.g., PR win + 30 days)
 * - Buffer days for bounded events (e.g., site issue end + 7 days)
 * - Superseded_by for persistent strategies
 * - comparison_significant flag for comparison period inclusion
 */
export async function getRelevantContextForReport(
  clientId: string,
  period: ReportPeriod
): Promise<RelevantContext> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  console.log('[Context Retrieval] Fetching context for report period:', period);

  try {
    // Fetch all context entries for this client
    const query = `
      SELECT
        id,
        client_id,
        category,
        title,
        description,
        event_date,
        start_date,
        end_date,
        magnitude,
        comparison_significant,
        superseded_by,
        source,
        source_document
      FROM \`${projectId}.business_context.context_entries\`
      WHERE client_id = '${clientId}'
      ORDER BY COALESCE(event_date, start_date) DESC
    `;

    const [rows] = await bigquery.query({ query, timeoutMs: 30000 });

    const allEntries: ContextEntry[] = rows.map((row: any) => ({
      id: row.id,
      client_id: row.client_id,
      category: row.category,
      title: row.title,
      description: row.description || '',
      event_date: row.event_date?.value || null,
      start_date: row.start_date?.value || null,
      end_date: row.end_date?.value || null,
      magnitude: row.magnitude,
      comparison_significant: row.comparison_significant || false,
      superseded_by: row.superseded_by,
      source: row.source,
      source_document: row.source_document,
    }));

    console.log('[Context Retrieval] Total entries for client:', allEntries.length);

    const direct: ContextEntry[] = [];
    const comparison: ContextEntry[] = [];
    const alwaysOn: ContextEntry[] = [];

    const reportStart = new Date(period.reportStart);
    const reportEnd = new Date(period.reportEnd);
    const comparisonStart = period.comparisonStart ? new Date(period.comparisonStart) : null;
    const comparisonEnd = period.comparisonEnd ? new Date(period.comparisonEnd) : null;

    for (const entry of allEntries) {
      const category = entry.category;
      const config = CATEGORY_CONFIG[category];

      // Always-on categories (brand_details)
      if (isAlwaysIncluded(category)) {
        alwaysOn.push(entry);
        continue;
      }

      // Standing conditions - smart handling based on dates and report period
      if (category === 'standing_condition') {
        // Skip if superseded
        if (entry.superseded_by) {
          continue;
        }

        const entryEndDate = entry.end_date ? new Date(entry.end_date) : null;
        const entryStartDate = entry.start_date ? new Date(entry.start_date) : null;

        // Current standing condition: no end_date OR end_date is in the future (relative to report)
        if (!entryEndDate || entryEndDate >= reportEnd) {
          // Only include if it started before or during the report period
          if (!entryStartDate || entryStartDate <= reportEnd) {
            alwaysOn.push(entry);
          }
        } else {
          // Historical standing condition: has end_date that has passed
          // Include in direct context ONLY if it overlapped with the report period
          // This provides historical context for why things might have been different
          if (entryStartDate && entryEndDate) {
            // Check if the standing condition period overlaps with report period
            if (entryStartDate <= reportEnd && entryEndDate >= reportStart) {
              direct.push(entry);
            }
          }
        }
        continue;
      }

      // Persistent strategies - check if active during report period and not superseded
      if (isPersistent(category)) {
        if (!entry.superseded_by) {
          // Strategy is still active - include in direct context
          const startDate = entry.start_date ? new Date(entry.start_date) : null;
          if (!startDate || startDate <= reportEnd) {
            direct.push(entry);
          }
        }
        continue;
      }

      // Point-in-time events with tail
      if (config?.type === 'point' && entry.event_date) {
        const eventDate = new Date(entry.event_date);
        const tailDays = getTailDays(category);
        const tailEnd = new Date(eventDate);
        tailEnd.setDate(tailEnd.getDate() + tailDays);

        // Check direct relevance: event + tail overlaps with report period
        if (eventDate <= reportEnd && tailEnd >= reportStart) {
          direct.push(entry);
        }
        // Check comparison relevance
        else if (
          period.includeComparison &&
          entry.comparison_significant &&
          comparisonStart &&
          comparisonEnd
        ) {
          if (eventDate <= comparisonEnd && tailEnd >= comparisonStart) {
            comparison.push(entry);
          }
        }
        continue;
      }

      // Bounded events with buffer
      if (config?.type === 'bounded' && (entry.start_date || entry.event_date)) {
        const startDate = new Date(entry.start_date || entry.event_date!);
        const endDate = entry.end_date ? new Date(entry.end_date) : startDate;
        const bufferDays = getBufferDays(category);
        const effectiveEnd = new Date(endDate);
        effectiveEnd.setDate(effectiveEnd.getDate() + bufferDays);

        // Check direct relevance: bounded period + buffer overlaps with report period
        if (startDate <= reportEnd && effectiveEnd >= reportStart) {
          direct.push(entry);
        }
        // Check comparison relevance
        else if (
          period.includeComparison &&
          entry.comparison_significant &&
          comparisonStart &&
          comparisonEnd
        ) {
          if (startDate <= comparisonEnd && effectiveEnd >= comparisonStart) {
            comparison.push(entry);
          }
        }
        continue;
      }

      // Fallback: treat as point-in-time with default tail
      const fallbackDate = entry.event_date || entry.start_date;
      if (fallbackDate) {
        const eventDate = new Date(fallbackDate);
        const tailEnd = new Date(eventDate);
        tailEnd.setDate(tailEnd.getDate() + 14); // Default 14 day tail

        if (eventDate <= reportEnd && tailEnd >= reportStart) {
          direct.push(entry);
        }
      }
    }

    console.log('[Context Retrieval] Results:', {
      direct: direct.length,
      comparison: comparison.length,
      alwaysOn: alwaysOn.length,
    });

    return { direct, comparison, alwaysOn };
  } catch (error) {
    console.error('[Context Retrieval] Error:', error);
    return { direct: [], comparison: [], alwaysOn: [] };
  }
}

/**
 * Format context for inclusion in report prompts
 */
export function formatContextForPrompt(context: RelevantContext): string {
  const sections: string[] = [];

  if (context.alwaysOn.length > 0) {
    sections.push('### Brand & Standing Context');
    for (const entry of context.alwaysOn) {
      sections.push(`- [${entry.category}] ${entry.title}`);
      if (entry.description) {
        sections.push(`  ${entry.description}`);
      }
    }
  }

  if (context.direct.length > 0) {
    sections.push('\n### Direct Context (affects this report period)');
    for (const entry of context.direct) {
      const magnitude = entry.magnitude ? ` [${entry.magnitude}]` : '';
      // Format date range for standing conditions and bounded events
      let dateStr = '';
      if (entry.start_date && entry.end_date) {
        dateStr = `${entry.start_date} to ${entry.end_date}`;
      } else if (entry.event_date) {
        dateStr = entry.event_date;
      } else if (entry.start_date) {
        dateStr = `from ${entry.start_date}`;
      }
      // Mark historical standing conditions clearly
      const historicalTag = entry.category === 'standing_condition' && entry.end_date ? ' [HISTORICAL]' : '';
      sections.push(`- [${entry.category}]${magnitude}${historicalTag} ${entry.title} (${dateStr})`);
      if (entry.description) {
        sections.push(`  ${entry.description}`);
      }
    }
  }

  if (context.comparison.length > 0) {
    sections.push('\n### Comparison Context (explains YoY/MoM differences)');
    sections.push('*These events occurred in the comparison period and explain why year-over-year metrics may look different:*');
    for (const entry of context.comparison) {
      const dateStr = entry.event_date || entry.start_date || '';
      const magnitude = entry.magnitude ? ` [${entry.magnitude}]` : '';
      sections.push(`- [${entry.category}]${magnitude} ${entry.title} (${dateStr})`);
      if (entry.description) {
        sections.push(`  ${entry.description}`);
      }
    }
  }

  if (sections.length === 0) {
    return '### Business Context\nNo relevant context entries found for this report period.';
  }

  return '## Business Context\n\n' + sections.join('\n');
}