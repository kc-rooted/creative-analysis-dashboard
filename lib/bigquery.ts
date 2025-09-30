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

// Get email dashboard KPIs and metrics
export async function getEmailDashboardData(): Promise<any> {
  const query = `
    WITH revenue_data AS (
      SELECT
        SUM(CASE WHEN attributed_email_type = 'Campaign' THEN attributed_revenue ELSE 0 END) as campaign_revenue_mtd,
        SUM(CASE WHEN attributed_email_type = 'Flow' THEN attributed_revenue ELSE 0 END) as flow_revenue_mtd,
        SUM(attributed_revenue) as total_email_revenue_mtd
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_daily_unified_attribution\`
      WHERE purchase_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        AND purchase_date < CURRENT_DATE()
    ),
    metrics_data AS (
      SELECT
        AVG(open_rate) as avg_open_rate,
        AVG(click_rate) as avg_click_rate,
        AVG(bounce_rate) as avg_bounce_rate,
        AVG(unsubscribe_rate) as avg_unsubscribe_rate,
        SUM(sends) as total_sends,
        SUM(bounces) as total_bounces,
        SUM(unsubscribes) as total_unsubscribes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_campaigns_detailed\`
      WHERE send_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        AND send_date < CURRENT_DATE()
    )
    SELECT * FROM revenue_data, metrics_data
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      timeoutMs: 30000,
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      totalEmailRevenue: Math.round(row.total_email_revenue_mtd || 0),
      campaignRevenue: Math.round(row.campaign_revenue_mtd || 0),
      flowRevenue: Math.round(row.flow_revenue_mtd || 0),
      avgOpenRate: (row.avg_open_rate || 0) * 100,
      avgClickRate: (row.avg_click_rate || 0) * 100,
      avgBounceRate: (row.avg_bounce_rate || 0) * 100,
      avgUnsubscribeRate: (row.avg_unsubscribe_rate || 0) * 100,
      totalSends: row.total_sends || 0,
      totalBounces: row.total_bounces || 0,
      totalUnsubscribes: row.total_unsubscribes || 0
    };
  } catch (error) {
    console.error('Error fetching email dashboard data:', error);
    return null;
  }
}

// Get email campaigns table data
export async function getEmailCampaignsTable(): Promise<any[]> {
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
    WHERE send_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
      AND send_date < CURRENT_DATE()
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
export async function getEmailFlowsTable(): Promise<any[]> {
  const query = `
    SELECT
      flow_name,
      SUM(sends) as total_sends,
      ROUND(AVG(open_rate) * 100, 2) as avg_open_rate,
      ROUND(AVG(click_rate) * 100, 2) as avg_click_rate,
      ROUND(AVG(bounce_rate) * 100, 2) as avg_bounce_rate,
      ROUND(AVG(unsubscribe_rate) * 100, 2) as avg_unsubscribe_rate,
      SUM(attributed_revenue) as total_revenue,
      SUM(attributed_purchases) as total_purchases,
      ROUND(AVG(revenue_per_send), 3) as avg_revenue_per_send
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.klaviyo_flows_step_performance\`
    GROUP BY flow_name
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
      sends: row.total_sends,
      openRate: row.avg_open_rate,
      clickRate: row.avg_click_rate,
      bounceRate: row.avg_bounce_rate,
      unsubscribeRate: row.avg_unsubscribe_rate,
      revenue: Math.round(row.total_revenue || 0),
      purchases: row.total_purchases,
      revenuePerSend: row.avg_revenue_per_send
    }));
  } catch (error) {
    console.error('Error fetching email flows table:', error);
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