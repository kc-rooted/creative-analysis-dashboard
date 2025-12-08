import { NextResponse } from 'next/server';
import { runSQLQuery, getRelevantContextForReport, formatContextForPrompt, ReportPeriod } from '@/lib/bigquery';

export const maxDuration = 60;

interface ReportDataRequest {
  reportType: string;
  clientId: string;
  period?: string; // e.g., '30d', '7d', 'mtd'
}

/**
 * Pre-fetch all data needed for a specific report type
 * This runs BEFORE the Claude API call to minimize token usage
 */
export async function POST(request: Request) {
  try {
    const { reportType, clientId, period = '30d' } = await request.json() as ReportDataRequest;

    console.log('[Report Data Fetch] Starting:', { reportType, clientId, period });

    // Map client to analytics dataset
    const clientDatasetMap: Record<string, string> = {
      'jumbomax': 'jumbomax_analytics',
      'puttout': 'puttout_analytics',
      'hb': 'hb_analytics'
    };

    const dataset = clientDatasetMap[clientId] || 'jumbomax_analytics';
    const projectId = 'intelligence-451803';

    // Calculate date range based on period
    const dateRange = getPeriodDateRange(period);
    console.log('[Report Data Fetch] Date range calculated:', dateRange);
    console.log('[Report Data Fetch] Server date:', new Date().toISOString());

    // Fetch data based on report type
    let reportData: any = {};

    switch (reportType) {
      case 'weekly-executive':
        reportData = await fetchWeeklyExecutiveData(projectId, dataset, dateRange);
        break;

      case 'monthly-performance':
        reportData = await fetchMonthlyPerformanceData(projectId, dataset, dateRange);
        break;

      case 'hb-monthly-performance':
        reportData = await fetchHBMonthlyPerformanceData(projectId, dataset, dateRange);
        break;

      case 'jumbomax-monthly-performance':
        // Note: jumbomax-6pillar uses same data fetcher, configured via data_fetcher column in BigQuery
        reportData = await fetchJumboMaxMonthlyPerformanceData(projectId, dataset, dateRange);
        break;

      case 'puttout-monthly-performance':
        reportData = await fetchPuttOutMonthlyPerformanceData(projectId, dataset, dateRange);
        break;

      case 'platform-deep-dive':
        reportData = await fetchPlatformDeepDiveData(projectId, dataset, dateRange);
        break;

      case 'email-retention':
        reportData = await fetchEmailRetentionData(projectId, dataset, dateRange);
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    console.log('[Report Data Fetch] Success:', {
      reportType,
      dataKeys: Object.keys(reportData),
      rowCounts: Object.entries(reportData).map(([key, val]: [string, any]) =>
        `${key}: ${Array.isArray(val) ? val.length : 'N/A'} rows`
      )
    });

    // Format data as compact markdown for token efficiency
    const formattedData = formatDataAsMarkdown(reportData, reportType);

    // Fetch relevant business context for this report period
    const contextPeriod: ReportPeriod = {
      reportStart: dateRange.start,
      reportEnd: dateRange.end,
      includeComparison: true,
      // Calculate YoY comparison period
      comparisonStart: getYoYDate(dateRange.start),
      comparisonEnd: getYoYDate(dateRange.end),
    };

    const businessContext = await getRelevantContextForReport(clientId, contextPeriod);
    const formattedContext = formatContextForPrompt(businessContext);

    console.log('[Report Data Fetch] Context retrieved:', {
      direct: businessContext.direct.length,
      comparison: businessContext.comparison.length,
      alwaysOn: businessContext.alwaysOn.length,
    });

    return NextResponse.json({
      success: true,
      reportType,
      clientId,
      period,
      dateRange,
      data: reportData,
      formattedData, // Add formatted markdown version
      businessContext, // Raw context objects
      formattedContext, // Formatted for prompt inclusion
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Report Data Fetch] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch report data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Convert period string to SQL date range
 */
function getPeriodDateRange(period: string): { start: string; end: string; sql: string } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;

  switch (period) {
    case '7d':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      break;
    case '30d':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      break;
    case 'mtd':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'ytd':
      startDate = new Date(today.getFullYear(), 0, 1);
      break;
    case 'previous-month':
      // Get the full previous month
      // e.g., if today is Nov 3, 2025, return Oct 1 - Oct 31, 2025
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0); // Last day of previous month
      break;
    default:
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
    sql: `DATE >= '${formatDate(startDate)}' AND DATE <= '${formatDate(endDate)}'`
  };
}

/**
 * Get the year-over-year date (same date, previous year)
 */
function getYoYDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Fetch data for Weekly Executive Summary
 */
async function fetchWeeklyExecutiveData(projectId: string, dataset: string, dateRange: any) {
  const queries = {
    // Revenue metrics
    revenue: `
      SELECT
        DATE,
        SUM(total_revenue) as revenue,
        SUM(total_orders) as orders
      FROM \`${projectId}.${dataset}.daily_performance\`
      WHERE ${dateRange.sql}
      GROUP BY DATE
      ORDER BY DATE DESC
    `,

    // Platform performance
    platformPerformance: `
      SELECT
        platform,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(revenue) / NULLIF(SUM(spend), 0) as roas
      FROM \`${projectId}.${dataset}.platform_daily_metrics\`
      WHERE ${dateRange.sql}
      GROUP BY platform
      ORDER BY spend DESC
    `,

    // Top products - using daily_product_performance for accuracy (matches Shopify UI)
    topProducts: `
      SELECT
        product_title as product_name,
        SUM(gross_units_sold) as units_sold,
        SUM(gross_revenue) as revenue
      FROM \`${projectId}.${dataset}.daily_product_performance\`
      WHERE ${dateRange.sql}
      GROUP BY product_title
      ORDER BY revenue DESC
      LIMIT 10
    `
  };

  const results: any = {};

  for (const [key, query] of Object.entries(queries)) {
    try {
      const rows = await runSQLQuery(query);
      results[key] = rows;
    } catch (error) {
      console.error(`[Report Data] Error fetching ${key}:`, error);
      results[key] = [];
    }
  }

  return results;
}

/**
 * Fetch data for Monthly Performance Review
 */
async function fetchMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  const queries = {
    // 1. Monthly Business Summary - 24 months of raw data for Claude to analyze
    // Claude will calculate MoM, YoY, trends, etc. from this data
    // NOTE: Aggregating from daily_business_metrics instead of monthly_business_summary
    // because the monthly view has a 12-month filter that excludes YoY comparison data
    monthlyBusinessSummary: `
      SELECT
        DATE_TRUNC(date, MONTH) as month,
        ROUND(SUM(gross_sales), 2) as monthly_gross_sales,
        ROUND(SUM(net_sales_after_refunds), 2) as monthly_net_sales_after_refunds,
        SUM(orders) as monthly_orders,
        ROUND(AVG(aov), 2) as avg_monthly_aov,
        ROUND(SUM(paid_attributed_revenue) / NULLIF(SUM(ad_spend), 0), 2) as attributed_blended_roas,
        ROUND(SUM(ad_spend), 2) as monthly_ad_spend,
        ROUND(SUM(facebook_spend), 2) as monthly_facebook_spend,
        ROUND(SUM(google_spend), 2) as monthly_google_spend,
        ROUND(SUM(paid_attributed_revenue), 2) as monthly_attributed_revenue,
        ROUND(SUM(refunds_processed) / NULLIF(SUM(net_sales_before_refunds), 0) * 100, 2) as return_rate_pct,
        ROUND(SUM(discounts) / NULLIF(SUM(gross_sales), 0) * 100, 2) as discount_rate_pct
      FROM \`${projectId}.${dataset}.daily_business_metrics\`
      WHERE date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 24 MONTH)
        AND date < DATE_TRUNC(CURRENT_DATE(), MONTH)
      GROUP BY DATE_TRUNC(date, MONTH)
      ORDER BY month DESC
    `,

    // 3. Paid campaigns aggregated from paid_media_performance for the report month
    // Sorted by ROAS DESC for top performers, ASC for bottom performers
    topCampaigns: `
      SELECT
        campaign_name,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
        SUM(purchases) as purchases,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        ROUND(SUM(clicks) / NULLIF(SUM(impressions), 0) * 100, 2) as ctr
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= '${dateRange.start}' AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      GROUP BY campaign_name
      ORDER BY roas DESC
      LIMIT 10
    `,

    bottomCampaigns: `
      SELECT
        campaign_name,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
        SUM(purchases) as purchases,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        ROUND(SUM(clicks) / NULLIF(SUM(impressions), 0) * 100, 2) as ctr
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= '${dateRange.start}' AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      GROUP BY campaign_name
      HAVING SUM(spend) > 0
      ORDER BY roas ASC
      LIMIT 5
    `,

    // 4. Top 10 Products - aggregated from daily_product_performance (matches Shopify UI)
    // NOTE: Using daily_product_performance instead of product_intelligence for accuracy
    // Uses REPORT MONTH date range (not rolling 30 days from today)
    topProducts: `
      SELECT
        product_title,
        SUM(gross_revenue) as revenue,
        SUM(gross_units_sold) as units_sold,
        ROUND(AVG(avg_selling_price), 2) as avg_price
      FROM \`${projectId}.${dataset}.daily_product_performance\`
      WHERE date >= '${dateRange.start}' AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      GROUP BY product_title
      ORDER BY revenue DESC
      LIMIT 10
    `,

    // 6. Bayesian Annual Forecast - Revenue projection for remainder of year
    bayesianForecast: `
      SELECT
        report_date,
        forecast_year,
        annual_revenue_target,
        annual_roas_target,
        ytd_revenue,
        ytd_attainment_pct,
        days_remaining,
        revenue_gap,
        prophet_annual_revenue_base,
        prophet_annual_revenue_conservative,
        prophet_annual_revenue_optimistic,
        probability_hit_revenue_target,
        probability_hit_roas_target,
        probability_hit_both_targets,
        p50_annual_revenue,
        revenue_risk_level,
        performance_vs_pace_pct
      FROM \`${projectId}.${dataset}.bayesian_annual_probability_forecast\`
      ORDER BY report_date DESC
      LIMIT 1
    `,

    // 7. Daily Business Performance - Report month + previous month (2 months of daily data)
    dailyBusinessPerformance: `
      SELECT
        date,
        revenue,
        orders,
        aov,
        gross_sales,
        net_sales_after_refunds
      FROM \`${projectId}.${dataset}.daily_business_metrics\`
      WHERE date >= DATE_SUB(DATE '${dateRange.start}', INTERVAL 1 MONTH)
        AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      ORDER BY date ASC
    `,

    // 8. Daily Paid Media Performance - Report month + previous month (aggregated by day)
    dailyPaidMediaPerformance: `
      SELECT
        date,
        SUM(spend) as spend,
        SUM(revenue) as attributed_revenue,
        SUM(purchases) as purchases,
        ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= DATE_SUB(DATE '${dateRange.start}', INTERVAL 1 MONTH)
        AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      GROUP BY date
      ORDER BY date ASC
    `,

    // 8b. Daily Paid Media by Platform - Report month + previous month (aggregated by day + platform)
    dailyPaidMediaByPlatform: `
      SELECT
        date,
        platform,
        SUM(spend) as spend,
        SUM(revenue) as attributed_revenue,
        SUM(purchases) as purchases,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= DATE_SUB(DATE '${dateRange.start}', INTERVAL 1 MONTH)
        AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      GROUP BY date, platform
      ORDER BY date ASC, platform
    `,

    // 8c. Weekly Paid Media by Platform - 24 months of weekly data for trend analysis
    weeklyPaidMediaByPlatform: `
      SELECT
        DATE_TRUNC(date, WEEK(MONDAY)) as week_start,
        platform,
        SUM(spend) as spend,
        SUM(revenue) as attributed_revenue,
        SUM(purchases) as purchases,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 24 MONTH)
        AND date < DATE_TRUNC(CURRENT_DATE(), MONTH)
      GROUP BY week_start, platform
      ORDER BY week_start DESC, platform
    `,

    // 9. Country Performance - Revenue and units by key markets (US, Canada, UK)
    countryPerformance: `
      SELECT
        country,
        country_code,
        SUM(total_revenue) as total_revenue,
        SUM(total_units_sold) as total_units_sold,
        ROUND(AVG(avg_unit_price), 2) as avg_unit_price
      FROM \`${projectId}.${dataset}.geographic_product_performance\`
      WHERE year_month = FORMAT_DATE('%Y-%m', DATE '${dateRange.start}')
        AND country_code IN ('US', 'CA', 'GB')
      GROUP BY country, country_code
      ORDER BY total_revenue DESC
    `
  };

  const results: any = {};

  for (const [key, query] of Object.entries(queries)) {
    try {
      const rows = await runSQLQuery(query);
      results[key] = rows;
      console.log(`[Report Data] ${key}: ${rows.length} rows fetched`);
    } catch (error) {
      console.error(`[Report Data] Error fetching ${key}:`, error);
      results[key] = [];
    }
  }

  // Fetch client configuration - revenue targets are in analysis_config JSON
  try {
    const clientId = dataset.replace('_analytics', '');
    const clientConfigQuery = `
      SELECT
        id,
        name,
        analysis_config
      FROM \`${projectId}.admin_configs.client_configurations\`
      WHERE id = '${clientId}'
      LIMIT 1
    `;
    const configRows = await runSQLQuery(clientConfigQuery);
    results.clientConfig = configRows;
    console.log(`[Report Data] clientConfig: ${configRows.length} rows fetched`);
  } catch (error) {
    console.error(`[Report Data] Error fetching client config:`, error);
    results.clientConfig = [];
  }

  return results;
}

/**
 * Fetch data for H&B Monthly Performance Review (extends standard monthly with funnel ads)
 *
 * SIMPLIFIED: Claude calculates ROAS, totals, etc from the daily data (dailyPaidMediaByPlatform).
 * We no longer pre-aggregate paid media metrics - Claude is perfectly capable of summing
 * spend and revenue and calculating ROAS from the daily rows.
 */
async function fetchHBMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  // First, get all the standard monthly performance data
  const baseData = await fetchMonthlyPerformanceData(projectId, dataset, dateRange);

  // NOTE: Paid media performance is available via dailyPaidMediaByPlatform in base data.
  // Claude will aggregate spend/revenue and calculate ROAS from that daily data.
  // No pre-aggregated paidMediaPerformance query needed.

  // NOTE: Country performance is already fetched in base fetchMonthlyPerformanceData
  // using the validated geographic_product_performance view.

  // Add H&B-specific funnel ads data
  const funnelAdsQuery = `
    SELECT
      ad_name,
      recommended_stage,
      all_star_rank,
      roas_rank,
      clicks_rank,
      efficiency_rank,
      ctr_rank,
      conversion_rank,
      roas,
      ctr_percent,
      cpc,
      image_url,
      video_id,
      thumbnail_url,
      creative_type
    FROM ${projectId}.${dataset}.ai_allstar_ad_bundles
    ORDER BY all_star_rank
  `;

  try {
    const allAds = await runSQLQuery(funnelAdsQuery);
    console.log(`[Report Data] funnelAds: ${allAds.length} rows fetched`);

    // Filter top 3 ads per funnel stage
    const funnelStages = ['TOFU', 'MOFU', 'BOFU'];
    const funnelAds: any = {};

    funnelStages.forEach(stage => {
      funnelAds[stage] = allAds
        .filter((ad: any) => ad.recommended_stage === stage)
        .slice(0, 3); // Top 3 per stage
    });

    baseData.funnelAds = funnelAds;
  } catch (error) {
    console.error('[Report Data] Error fetching funnel ads:', error);
    baseData.funnelAds = { TOFU: [], MOFU: [], BOFU: [] };
  }

  return baseData;
}

/**
 * Fetch data for JumboMax Monthly Performance Review (extends base with paid media, funnel ads, and email)
 */
async function fetchJumboMaxMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  // Get the base + paid media + funnel ads data
  const baseData = await fetchHBMonthlyPerformanceData(projectId, dataset, dateRange);

  // Email revenue by type (Campaign vs Flow) from klaviyo_daily_unified_attribution
  // This uses PURCHASE date to match dashboard, not send date
  const emailByTypeQuery = `
    SELECT
      attributed_email_type as email_type,
      SUM(attributed_purchasers) as purchasers,
      SUM(attributed_purchases) as purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND attributed_email_type IS NOT NULL
    GROUP BY attributed_email_type
    ORDER BY attributed_revenue DESC
  `;

  // Overall email totals (sum of campaign + flow revenue by PURCHASE date)
  const emailPerformanceQuery = `
    SELECT
      SUM(attributed_purchasers) as total_attributed_purchasers,
      SUM(attributed_purchases) as total_attributed_purchases,
      SUM(attributed_revenue) as total_attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
  `;

  // Campaign revenue details from klaviyo_daily_campaign_revenue (by PURCHASE date)
  const emailCampaignRevenueQuery = `
    SELECT
      campaign_name,
      SUM(attributed_purchasers) as attributed_purchasers,
      SUM(attributed_purchases) as attributed_purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_campaign_revenue\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
    GROUP BY campaign_name
    ORDER BY attributed_revenue DESC
    LIMIT 20
  `;

  // Flow revenue details from klaviyo_daily_flow_revenue
  const flowRevenueQuery = `
    SELECT
      flow_name,
      flow_category,
      SUM(attributed_purchasers) as attributed_purchasers,
      SUM(attributed_purchases) as attributed_purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value,
      AVG(revenue_per_purchaser) as revenue_per_purchaser
    FROM \`${projectId}.${dataset}.klaviyo_daily_flow_revenue\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
    GROUP BY flow_name, flow_category
    ORDER BY attributed_revenue DESC
  `;

  // Email campaign send performance from klaviyo_campaigns_detailed (by SEND date)
  // This provides engagement metrics: sends, opens, clicks, open rate, click rate
  // NOTE: We use unique_clicks for accurate weighted click rate calculation (matches Klaviyo UI)
  const emailCampaignSendPerformanceQuery = `
    SELECT
      campaign_name,
      send_date,
      sends,
      unique_opens,
      unique_clicks,
      ROUND(open_rate * 100, 2) as open_rate_pct,
      ROUND(click_rate * 100, 2) as click_rate_pct,
      attributed_revenue,
      avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_campaigns_detailed\`
    WHERE send_date >= '${dateRange.start}' AND send_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
    ORDER BY send_date DESC
  `;

  try {
    const emailOverall = await runSQLQuery(emailPerformanceQuery);
    console.log(`[Report Data] emailPerformance: ${emailOverall.length} rows fetched`);
    baseData.emailPerformance = emailOverall;
  } catch (error) {
    console.error('[Report Data] Error fetching email performance:', error);
    baseData.emailPerformance = [];
  }

  try {
    const emailByType = await runSQLQuery(emailByTypeQuery);
    console.log(`[Report Data] emailByType: ${emailByType.length} rows fetched`);
    baseData.emailByType = emailByType;
  } catch (error) {
    console.error('[Report Data] Error fetching email by type:', error);
    baseData.emailByType = [];
  }

  try {
    const emailCampaignRevenue = await runSQLQuery(emailCampaignRevenueQuery);
    console.log(`[Report Data] emailCampaignRevenue: ${emailCampaignRevenue.length} rows fetched`);
    baseData.emailCampaignRevenue = emailCampaignRevenue;
  } catch (error) {
    console.error('[Report Data] Error fetching email campaign revenue:', error);
    baseData.emailCampaignRevenue = [];
  }

  try {
    const emailCampaignSendPerformance = await runSQLQuery(emailCampaignSendPerformanceQuery);
    console.log(`[Report Data] emailCampaignSendPerformance: ${emailCampaignSendPerformance.length} rows fetched`);
    baseData.emailCampaignSendPerformance = emailCampaignSendPerformance;
  } catch (error) {
    console.error('[Report Data] Error fetching email campaign send performance:', error);
    baseData.emailCampaignSendPerformance = [];
  }

  try {
    const flowRevenue = await runSQLQuery(flowRevenueQuery);
    console.log(`[Report Data] flowRevenue: ${flowRevenue.length} rows fetched`);
    baseData.flowRevenue = flowRevenue;
  } catch (error) {
    console.error('[Report Data] Error fetching flow revenue:', error);
    baseData.flowRevenue = [];
  }

  // ========================================
  // YoY EMAIL DATA (same month, previous year)
  // ========================================
  // Calculate YoY date - same month, previous year
  const yoyStartDate = getYoYDate(dateRange.start);

  // YoY Email totals by type (Campaign vs Flow)
  const yoyEmailByTypeQuery = `
    SELECT
      attributed_email_type as email_type,
      SUM(attributed_purchasers) as purchasers,
      SUM(attributed_purchases) as purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${yoyStartDate}' AND purchase_date < DATE_ADD(DATE '${yoyStartDate}', INTERVAL 1 MONTH)
      AND attributed_email_type IS NOT NULL
    GROUP BY attributed_email_type
    ORDER BY attributed_revenue DESC
  `;

  // YoY Overall email totals
  const yoyEmailPerformanceQuery = `
    SELECT
      SUM(attributed_purchasers) as total_attributed_purchasers,
      SUM(attributed_purchases) as total_attributed_purchases,
      SUM(attributed_revenue) as total_attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${yoyStartDate}' AND purchase_date < DATE_ADD(DATE '${yoyStartDate}', INTERVAL 1 MONTH)
  `;

  // YoY Campaign revenue details
  const yoyEmailCampaignRevenueQuery = `
    SELECT
      campaign_name,
      SUM(attributed_purchasers) as attributed_purchasers,
      SUM(attributed_purchases) as attributed_purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_campaign_revenue\`
    WHERE purchase_date >= '${yoyStartDate}' AND purchase_date < DATE_ADD(DATE '${yoyStartDate}', INTERVAL 1 MONTH)
    GROUP BY campaign_name
    ORDER BY attributed_revenue DESC
    LIMIT 20
  `;

  // YoY Flow revenue details
  const yoyFlowRevenueQuery = `
    SELECT
      flow_name,
      flow_category,
      SUM(attributed_purchasers) as attributed_purchasers,
      SUM(attributed_purchases) as attributed_purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value,
      AVG(revenue_per_purchaser) as revenue_per_purchaser
    FROM \`${projectId}.${dataset}.klaviyo_daily_flow_revenue\`
    WHERE purchase_date >= '${yoyStartDate}' AND purchase_date < DATE_ADD(DATE '${yoyStartDate}', INTERVAL 1 MONTH)
    GROUP BY flow_name, flow_category
    ORDER BY attributed_revenue DESC
  `;

  // Fetch YoY email data
  try {
    const yoyEmailPerformance = await runSQLQuery(yoyEmailPerformanceQuery);
    console.log(`[Report Data] yoyEmailPerformance: ${yoyEmailPerformance.length} rows fetched`);
    baseData.yoyEmailPerformance = yoyEmailPerformance;
  } catch (error) {
    console.error('[Report Data] Error fetching YoY email performance:', error);
    baseData.yoyEmailPerformance = [];
  }

  try {
    const yoyEmailByType = await runSQLQuery(yoyEmailByTypeQuery);
    console.log(`[Report Data] yoyEmailByType: ${yoyEmailByType.length} rows fetched`);
    baseData.yoyEmailByType = yoyEmailByType;
  } catch (error) {
    console.error('[Report Data] Error fetching YoY email by type:', error);
    baseData.yoyEmailByType = [];
  }

  try {
    const yoyEmailCampaignRevenue = await runSQLQuery(yoyEmailCampaignRevenueQuery);
    console.log(`[Report Data] yoyEmailCampaignRevenue: ${yoyEmailCampaignRevenue.length} rows fetched`);
    baseData.yoyEmailCampaignRevenue = yoyEmailCampaignRevenue;
  } catch (error) {
    console.error('[Report Data] Error fetching YoY email campaign revenue:', error);
    baseData.yoyEmailCampaignRevenue = [];
  }

  try {
    const yoyFlowRevenue = await runSQLQuery(yoyFlowRevenueQuery);
    console.log(`[Report Data] yoyFlowRevenue: ${yoyFlowRevenue.length} rows fetched`);
    baseData.yoyFlowRevenue = yoyFlowRevenue;
  } catch (error) {
    console.error('[Report Data] Error fetching YoY flow revenue:', error);
    baseData.yoyFlowRevenue = [];
  }

  return baseData;
}

/**
 * Fetch data for PuttOUT Monthly Performance Review
 * Uses base monthly data with paid media and email performance
 */
async function fetchPuttOutMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  // Start with base monthly performance data
  const baseData = await fetchMonthlyPerformanceData(projectId, dataset, dateRange);

  // Add paid media performance metrics (Meta only - no detailed Google breakout)
  const paidMediaQuery = `
    SELECT
      platform,
      SUM(spend) as total_spend,
      SUM(revenue) as total_revenue,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(reach) as total_reach,
      SUM(purchases) as total_purchases,
      AVG(frequency) as avg_frequency,
      AVG(conversion_rate) as avg_conversion_rate,
      SUM(revenue) / NULLIF(SUM(spend), 0) as calculated_roas,
      SUM(spend) / NULLIF(SUM(impressions) / 1000, 0) as calculated_cpm,
      SUM(spend) / NULLIF(SUM(clicks), 0) as calculated_cpc,
      (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as calculated_ctr
    FROM \`${projectId}.${dataset}.paid_media_performance\`
    WHERE date >= '${dateRange.start}' AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
    GROUP BY platform
    ORDER BY platform
  `;

  try {
    const paidMediaData = await runSQLQuery(paidMediaQuery);
    console.log(`[Report Data] paidMediaPerformance: ${paidMediaData.length} rows fetched`);
    baseData.paidMediaPerformance = paidMediaData;
  } catch (error) {
    console.error('[Report Data] Error fetching paid media performance:', error);
    baseData.paidMediaPerformance = [];
  }

  // Email revenue by type (Campaign vs Flow) from klaviyo_daily_unified_attribution
  // This uses PURCHASE date to match dashboard, not send date
  const emailByTypeQuery = `
    SELECT
      attributed_email_type as email_type,
      SUM(attributed_purchasers) as purchasers,
      SUM(attributed_purchases) as purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND attributed_email_type IS NOT NULL
    GROUP BY attributed_email_type
    ORDER BY attributed_revenue DESC
  `;

  // Overall email totals (sum of campaign + flow revenue by PURCHASE date)
  const emailPerformanceQuery = `
    SELECT
      SUM(attributed_purchasers) as total_attributed_purchasers,
      SUM(attributed_purchases) as total_attributed_purchases,
      SUM(attributed_revenue) as total_attributed_revenue,
      AVG(avg_order_value) as avg_order_value
    FROM \`${projectId}.${dataset}.klaviyo_daily_unified_attribution\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
  `;

  // Flow revenue details from klaviyo_daily_flow_revenue
  const flowRevenueQuery = `
    SELECT
      flow_name,
      flow_category,
      SUM(attributed_purchasers) as attributed_purchasers,
      SUM(attributed_purchases) as attributed_purchases,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(avg_order_value) as avg_order_value,
      AVG(revenue_per_purchaser) as revenue_per_purchaser
    FROM \`${projectId}.${dataset}.klaviyo_daily_flow_revenue\`
    WHERE purchase_date >= '${dateRange.start}' AND purchase_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
    GROUP BY flow_name, flow_category
    ORDER BY attributed_revenue DESC
  `;

  try {
    const emailOverall = await runSQLQuery(emailPerformanceQuery);
    console.log(`[Report Data] emailPerformance: ${emailOverall.length} rows fetched`);
    baseData.emailPerformance = emailOverall;
  } catch (error) {
    console.error('[Report Data] Error fetching email performance:', error);
    baseData.emailPerformance = [];
  }

  try {
    const emailByType = await runSQLQuery(emailByTypeQuery);
    console.log(`[Report Data] emailByType: ${emailByType.length} rows fetched`);
    baseData.emailByType = emailByType;
  } catch (error) {
    console.error('[Report Data] Error fetching email by type:', error);
    baseData.emailByType = [];
  }

  try {
    const flowRevenue = await runSQLQuery(flowRevenueQuery);
    console.log(`[Report Data] flowRevenue: ${flowRevenue.length} rows fetched`);
    baseData.flowRevenue = flowRevenue;
  } catch (error) {
    console.error('[Report Data] Error fetching flow revenue:', error);
    baseData.flowRevenue = [];
  }

  return baseData;
}

/**
 * Fetch data for Platform Deep Dive
 */
async function fetchPlatformDeepDiveData(projectId: string, dataset: string, dateRange: any) {
  const queries = {
    // Campaign-level performance
    campaigns: `
      SELECT
        campaign_name,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(revenue) / NULLIF(SUM(spend), 0) as roas,
        SUM(clicks) / NULLIF(SUM(impressions), 0) as ctr,
        SUM(conversions) / NULLIF(SUM(clicks), 0) as cvr
      FROM \`${projectId}.${dataset}.campaign_performance\`
      WHERE ${dateRange.sql}
      GROUP BY campaign_name
      ORDER BY spend DESC
      LIMIT 20
    `,

    // Daily trend
    dailyTrend: `
      SELECT
        DATE,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions
      FROM \`${projectId}.${dataset}.platform_daily_metrics\`
      WHERE ${dateRange.sql}
      GROUP BY DATE
      ORDER BY DATE ASC
    `
  };

  const results: any = {};

  for (const [key, query] of Object.entries(queries)) {
    try {
      const rows = await runSQLQuery(query);
      results[key] = rows;
    } catch (error) {
      console.error(`[Report Data] Error fetching ${key}:`, error);
      results[key] = [];
    }
  }

  return results;
}

/**
 * Fetch data for Email & Retention Report
 */
async function fetchEmailRetentionData(projectId: string, dataset: string, dateRange: any) {
  const queries = {
    // Email campaign performance
    emailCampaigns: `
      SELECT
        campaign_name,
        sent_count,
        open_count,
        click_count,
        revenue,
        open_count / NULLIF(sent_count, 0) as open_rate,
        click_count / NULLIF(sent_count, 0) as click_rate
      FROM \`${projectId}.${dataset}.email_campaigns\`
      WHERE ${dateRange.sql}
      ORDER BY sent_count DESC
      LIMIT 20
    `,

    // Customer retention metrics
    retention: `
      SELECT
        cohort_month,
        customers,
        repeat_customers,
        repeat_customers / NULLIF(customers, 0) as retention_rate
      FROM \`${projectId}.${dataset}.customer_cohorts\`
      WHERE ${dateRange.sql}
      ORDER BY cohort_month DESC
    `
  };

  const results: any = {};

  for (const [key, query] of Object.entries(queries)) {
    try {
      const rows = await runSQLQuery(query);
      results[key] = rows;
    } catch (error) {
      console.error(`[Report Data] Error fetching ${key}:`, error);
      results[key] = [];
    }
  }

  return results;
}

/**
 * Format data as compact markdown tables for token efficiency
 */
function formatDataAsMarkdown(data: any, reportType: string): string {
  if (reportType === 'monthly-performance') {
    return formatMonthlyReportAsMarkdown(data);
  }
  if (reportType === 'hb-monthly-performance') {
    return formatHBMonthlyReportAsMarkdown(data);
  }
  if (reportType === 'jumbomax-monthly-performance' || reportType === 'jumbomax-6pillar-performance') {
    return formatJumboMaxMonthlyReportAsMarkdown(data);
  }
  if (reportType === 'puttout-monthly-performance') {
    return formatPuttOutMonthlyReportAsMarkdown(data);
  }
  // Add other report types as needed
  return JSON.stringify(data, null, 2);
}

function formatMonthlyReportAsMarkdown(data: any): string {
  let markdown = '# PRE-FETCHED DATA\n\n';

  // ⚠️ CRITICAL INSTRUCTION AT THE TOP
  markdown += `**⚠️ CRITICAL INSTRUCTION - READ THIS FIRST:**\n`;
  markdown += `**ROAS DEFINITION:** We ONLY report on ATTRIBUTED BLENDED ROAS, which is paid media attributed revenue divided by paid media spend. Never use total sales ROAS or any other ROAS calculation.\n\n`;
  markdown += `Review the DAILY PERFORMANCE PROGRESSION and COUNTRY PERFORMANCE tables (at the bottom of this data) to analyze:\n`;
  markdown += `1. Daily trends - how ROAS evolved throughout the month\n`;
  markdown += `2. Geographic breakdown - revenue distribution across US, Canada, and UK markets\n`;
  markdown += `3. Meta attribution by country - which markets drive the strongest Meta ROAS (H&B only)\n`;
  markdown += `Include insights about ROAS trends, geographic performance, and Meta attribution in your Executive Summary bullet points.\n\n`;
  markdown += `---\n\n`;

  // Annual Revenue Forecast (Bayesian) - Model output, not calculable from raw data
  if (data.bayesianForecast?.[0]) {
    const forecast = data.bayesianForecast[0];
    markdown += `## ANNUAL REVENUE FORECAST\n`;
    markdown += `**Bayesian forecast model output for annual pacing:**\n\n`;

    markdown += `- Forecasted Annual Revenue (Base): $${forecast.prophet_annual_revenue_base?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Annual Revenue Target: $${forecast.annual_revenue_target?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Probability to Hit Target: ${forecast.probability_hit_revenue_target}%\n`;
    markdown += `- Days Remaining in Year: ${forecast.days_remaining}\n`;
    markdown += `- YTD Revenue: $${parseFloat(forecast.ytd_revenue)?.toLocaleString() || 'N/A'}\n`;
    markdown += `- YTD Attainment: ${forecast.ytd_attainment_pct?.toFixed(1) || 0}%\n`;
    markdown += `- Conservative Scenario: $${forecast.prophet_annual_revenue_conservative?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Optimistic Scenario: $${forecast.prophet_annual_revenue_optimistic?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Risk Level: ${forecast.revenue_risk_level}\n\n`;
  }

  // Monthly Business Summary - 24 months of raw data
  // Claude will calculate MoM, YoY, trends from this data
  if (data.monthlyBusinessSummary?.length > 0) {
    markdown += `\n## MONTHLY BUSINESS PERFORMANCE (24 months)\n`;
    markdown += `**Calculate MoM (compare to previous row) and YoY (compare to same month last year) from this data:**\n\n`;
    markdown += `| Month | Gross Sales | Net Sales | Orders | AOV | ROAS | Ad Spend | FB Spend | Google Spend |\n`;
    markdown += `|-------|-------------|-----------|--------|-----|------|----------|----------|-------------|\n`;
    data.monthlyBusinessSummary.forEach((m: any) => {
      const monthStr = m.month?.value || m.month;
      markdown += `| ${monthStr} | $${parseFloat(m.monthly_gross_sales || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(m.monthly_net_sales_after_refunds || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${m.monthly_orders || 0} | $${parseFloat(m.avg_monthly_aov || 0).toFixed(2)} | ${m.attributed_blended_roas?.toFixed(2) || 0}x | $${parseFloat(m.monthly_ad_spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(m.monthly_facebook_spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(m.monthly_google_spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} |\n`;
    });
    markdown += `\n`;
  }

  // Client Config - Parse JSON field for revenue targets
  if (data.clientConfig?.[0]?.analysis_config) {
    const config = data.clientConfig[0];
    const analysisConfig = typeof config.analysis_config === 'string'
      ? JSON.parse(config.analysis_config)
      : config.analysis_config;

    if (analysisConfig.monthlyRevenueTargets || analysisConfig.annualRevenueTarget) {
      markdown += `\n## Revenue Targets\n`;
      if (analysisConfig.monthlyRevenueTargets) {
        markdown += `- Monthly Target: $${analysisConfig.monthlyRevenueTargets?.toLocaleString() || 'N/A'}\n`;
      }
      if (analysisConfig.annualRevenueTarget) {
        markdown += `- Annual Target: $${analysisConfig.annualRevenueTarget?.toLocaleString() || 'N/A'}\n`;
      }
    }
  }

  // Top Campaigns by ROAS (from paid_media_performance for report month)
  if (data.topCampaigns?.length > 0) {
    markdown += `\n## PAID CAMPAIGNS BY ROAS (Report Month)\n`;
    markdown += `**Campaign performance for the report period:**\n\n`;
    markdown += `| Campaign | Spend | Revenue | ROAS | Purchases | CTR |\n`;
    markdown += `|----------|-------|---------|------|-----------|-----|\n`;
    data.topCampaigns.forEach((c: any) => {
      markdown += `| ${c.campaign_name} | $${parseFloat(c.spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(c.revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${c.roas?.toFixed(2) || 0}x | ${c.purchases || 0} | ${c.ctr?.toFixed(2) || 0}% |\n`;
    });
    markdown += `\n`;
  }

  // Bottom Campaigns by ROAS (lowest performers)
  if (data.bottomCampaigns?.length > 0) {
    markdown += `\n## LOWEST ROAS CAMPAIGNS (Report Month)\n`;
    markdown += `**Campaigns with lowest ROAS for review:**\n\n`;
    markdown += `| Campaign | Spend | Revenue | ROAS | Purchases | CTR |\n`;
    markdown += `|----------|-------|---------|------|-----------|-----|\n`;
    data.bottomCampaigns.forEach((c: any) => {
      markdown += `| ${c.campaign_name} | $${parseFloat(c.spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(c.revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${c.roas?.toFixed(2) || 0}x | ${c.purchases || 0} | ${c.ctr?.toFixed(2) || 0}% |\n`;
    });
    markdown += `\n`;
  }

  // Products - Top 10 by revenue for the REPORT MONTH
  if (data.topProducts?.length > 0) {
    markdown += `\n## TOP PRODUCTS (Report Month)\n`;
    markdown += `**Product revenue for the report period:**\n\n`;
    markdown += `| Product | Revenue | Units Sold | Avg Price |\n`;
    markdown += `|---------|---------|------------|----------|\n`;
    data.topProducts.forEach((p: any) => {
      markdown += `| ${p.product_title} | $${parseFloat(p.revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${p.units_sold || 0} | $${parseFloat(p.avg_price || 0).toFixed(2)} |\n`;
    });
    markdown += `\n`;
  }

  // Daily Business Performance - Revenue and orders by day from Shopify
  if (data.dailyBusinessPerformance?.length > 0) {
    markdown += `\n## DAILY BUSINESS PERFORMANCE (Shopify Revenue & Orders)\n`;
    markdown += `**Daily revenue and order counts for the month:**\n\n`;
    markdown += `| Date | Revenue | Orders | AOV | Gross Sales | Net Sales |\n`;
    markdown += `|------|---------|--------|-----|-------------|----------|\n`;
    data.dailyBusinessPerformance.forEach((day: any) => {
      const dateStr = day.date?.value || day.date;
      markdown += `| ${dateStr} | $${parseFloat(day.revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${day.orders || 0} | $${parseFloat(day.aov || 0).toFixed(2)} | $${parseFloat(day.gross_sales || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(day.net_sales_after_refunds || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} |\n`;
    });

    // Add weekly summaries
    if (data.dailyBusinessPerformance.length >= 7) {
      markdown += `\n**Weekly Summaries:**\n`;
      const weeks = Math.ceil(data.dailyBusinessPerformance.length / 7);
      for (let i = 0; i < weeks; i++) {
        const weekData = data.dailyBusinessPerformance.slice(i * 7, Math.min((i + 1) * 7, data.dailyBusinessPerformance.length));
        const totalRevenue = weekData.reduce((sum: number, d: any) => sum + parseFloat(d.revenue || 0), 0);
        const totalOrders = weekData.reduce((sum: number, d: any) => sum + (d.orders || 0), 0);
        const avgAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        markdown += `- Week ${i + 1}: Revenue $${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}, Orders ${totalOrders}, AOV $${avgAOV.toFixed(2)}\n`;
      }
      markdown += `\n`;
    }
  }

  // PLATFORM SUMMARY - Pre-calculated monthly totals (source of truth for platform ROAS)
  // Aggregate from dailyPaidMediaByPlatform to get report month and previous month totals
  if (data.dailyPaidMediaByPlatform?.length > 0) {
    // Group daily data by month and platform
    const monthlyPlatformTotals: Record<string, Record<string, { spend: number; revenue: number; purchases: number; impressions: number; clicks: number }>> = {};

    data.dailyPaidMediaByPlatform.forEach((day: any) => {
      const dateStr = day.date?.value || day.date;
      const monthKey = dateStr.substring(0, 7); // YYYY-MM
      const platform = day.platform;

      if (!monthlyPlatformTotals[monthKey]) {
        monthlyPlatformTotals[monthKey] = {};
      }
      if (!monthlyPlatformTotals[monthKey][platform]) {
        monthlyPlatformTotals[monthKey][platform] = { spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0 };
      }

      monthlyPlatformTotals[monthKey][platform].spend += parseFloat(day.spend || 0);
      monthlyPlatformTotals[monthKey][platform].revenue += parseFloat(day.attributed_revenue || 0);
      monthlyPlatformTotals[monthKey][platform].purchases += parseInt(day.purchases || 0);
      monthlyPlatformTotals[monthKey][platform].impressions += parseInt(day.impressions || 0);
      monthlyPlatformTotals[monthKey][platform].clicks += parseInt(day.clicks || 0);
    });

    // Sort months descending (most recent first)
    const sortedMonths = Object.keys(monthlyPlatformTotals).sort().reverse();

    // Output platform summaries for each month
    sortedMonths.forEach((monthKey, index) => {
      const monthDate = new Date(monthKey + '-01T00:00:00');
      const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const platforms = monthlyPlatformTotals[monthKey];

      // Calculate totals across all platforms
      let totalSpend = 0;
      let totalRevenue = 0;
      let totalPurchases = 0;

      Object.values(platforms).forEach(p => {
        totalSpend += p.spend;
        totalRevenue += p.revenue;
        totalPurchases += p.purchases;
      });

      const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      if (index === 0) {
        markdown += `\n## MONTHLY PLATFORM SUMMARY - ${monthName} (REPORT MONTH)\n`;
        markdown += `**USE THESE PRE-CALCULATED VALUES FOR PLATFORM ROAS REPORTING:**\n\n`;
      } else {
        markdown += `\n## MONTHLY PLATFORM SUMMARY - ${monthName} (PRIOR MONTH - for MoM comparison)\n`;
        markdown += `**Use these values to calculate Month-over-Month changes:**\n\n`;
      }

      markdown += `| Platform | Spend | Attributed Revenue | Purchases | ROAS |\n`;
      markdown += `|----------|-------|-------------------|-----------|------|\n`;

      // Normalize platform names for display
      Object.entries(platforms).forEach(([platform, totals]) => {
        const displayName = platform === 'Facebook' ? 'Meta' : platform;
        const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
        markdown += `| ${displayName} | $${totals.spend.toLocaleString('en-US', {maximumFractionDigits: 0})} | $${totals.revenue.toLocaleString('en-US', {maximumFractionDigits: 0})} | ${totals.purchases.toLocaleString()} | ${roas.toFixed(2)}x |\n`;
      });

      // Add total row
      markdown += `| **TOTAL (Blended)** | **$${totalSpend.toLocaleString('en-US', {maximumFractionDigits: 0})}** | **$${totalRevenue.toLocaleString('en-US', {maximumFractionDigits: 0})}** | **${totalPurchases.toLocaleString()}** | **${blendedRoas.toFixed(2)}x** |\n`;
      markdown += `\n`;
    });
  }

  // Daily Paid Media by Platform - for trend analysis (NOT for monthly totals)
  if (data.dailyPaidMediaByPlatform?.length > 0) {
    markdown += `\n## DAILY PAID MEDIA BY PLATFORM (Trend Analysis)\n`;
    markdown += `**Use for daily trend analysis and pattern identification.**\n`;
    markdown += `**Do NOT manually aggregate for monthly platform totals - use PLATFORM SUMMARY above.**\n\n`;
    markdown += `| Date | Platform | Spend | Revenue | Purchases | Impressions | Clicks | ROAS |\n`;
    markdown += `|------|----------|-------|---------|-----------|-------------|--------|------|\n`;
    data.dailyPaidMediaByPlatform.forEach((day: any) => {
      const dateStr = day.date?.value || day.date;
      markdown += `| ${dateStr} | ${day.platform} | $${parseFloat(day.spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(day.attributed_revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${day.purchases || 0} | ${parseFloat(day.impressions || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${parseFloat(day.clicks || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${day.roas?.toFixed(2) || '0.00'}x |\n`;
    });
    markdown += `\n`;
  }

  // Weekly Paid Media by Platform - 24 months of weekly data for trend analysis
  if (data.weeklyPaidMediaByPlatform?.length > 0) {
    markdown += `\n## WEEKLY PAID MEDIA BY PLATFORM (24 months)\n`;
    markdown += `**Weekly totals by platform for long-term trend analysis:**\n\n`;
    markdown += `| Week Start | Platform | Spend | Revenue | Purchases | Impressions | Clicks | ROAS |\n`;
    markdown += `|------------|----------|-------|---------|-----------|-------------|--------|------|\n`;
    data.weeklyPaidMediaByPlatform.forEach((week: any) => {
      const weekStr = week.week_start?.value || week.week_start;
      markdown += `| ${weekStr} | ${week.platform} | $${parseFloat(week.spend || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | $${parseFloat(week.attributed_revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${week.purchases || 0} | ${parseFloat(week.impressions || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${parseFloat(week.clicks || 0).toLocaleString('en-US', {maximumFractionDigits: 0})} | ${week.roas?.toFixed(2) || '0.00'}x |\n`;
    });
    markdown += `\n`;
  }

  // Country Performance - Revenue by key markets
  if (data.countryPerformance?.length > 0) {
    markdown += `\n## COUNTRY PERFORMANCE (Geographic Breakdown)\n`;

    // Check if we have Meta attribution data (H&B only)
    const hasMetaData = data.countryPerformance.some((c: any) => c.meta_attributed_revenue !== undefined);

    if (hasMetaData) {
      markdown += `**Revenue and units sold by key markets with Meta attribution (US, Canada, UK):**\n\n`;
      markdown += `| Country | Total Revenue | Meta Revenue | Meta ROAS | Units Sold | Avg Unit Price |\n`;
      markdown += `|---------|---------------|--------------|-----------|------------|----------------|\n`;
      data.countryPerformance.forEach((country: any) => {
        const metaRoas = country.meta_roas ? `${country.meta_roas.toFixed(2)}x` : 'N/A';
        markdown += `| ${country.country} (${country.country_code}) | $${country.total_revenue?.toLocaleString() || 0} | $${country.meta_attributed_revenue?.toLocaleString() || 0} | ${metaRoas} | ${country.total_units_sold?.toLocaleString() || 0} | $${country.avg_unit_price?.toFixed(2) || '0.00'} |\n`;
      });

      // Calculate percentage breakdowns
      const totalRevenue = data.countryPerformance.reduce((sum: number, c: any) => sum + (c.total_revenue || 0), 0);
      const totalMetaRevenue = data.countryPerformance.reduce((sum: number, c: any) => sum + (c.meta_attributed_revenue || 0), 0);

      if (totalRevenue > 0) {
        markdown += `\n**Revenue Distribution:**\n`;
        data.countryPerformance.forEach((country: any) => {
          const pct = ((country.total_revenue / totalRevenue) * 100).toFixed(1);
          const metaPct = totalMetaRevenue > 0 ? ((country.meta_attributed_revenue / totalMetaRevenue) * 100).toFixed(1) : 0;
          markdown += `- ${country.country}: ${pct}% of total revenue`;
          if (totalMetaRevenue > 0) {
            markdown += `, ${metaPct}% of Meta revenue`;
          }
          markdown += `\n`;
        });
        markdown += `\n`;
      }
    } else {
      // Standard version without Meta data (JumboMax, PuttOUT)
      markdown += `**Revenue and units sold by key markets (US, Canada, UK):**\n\n`;
      markdown += `| Country | Revenue | Units Sold | Avg Unit Price |\n`;
      markdown += `|---------|---------|------------|----------------|\n`;
      data.countryPerformance.forEach((country: any) => {
        markdown += `| ${country.country} (${country.country_code}) | $${country.total_revenue?.toLocaleString() || 0} | ${country.total_units_sold?.toLocaleString() || 0} | $${country.avg_unit_price?.toFixed(2) || '0.00'} |\n`;
      });

      // Calculate percentage breakdown
      const totalRevenue = data.countryPerformance.reduce((sum: number, c: any) => sum + (c.total_revenue || 0), 0);
      if (totalRevenue > 0) {
        markdown += `\n**Revenue Distribution:**\n`;
        data.countryPerformance.forEach((country: any) => {
          const pct = ((country.total_revenue / totalRevenue) * 100).toFixed(1);
          markdown += `- ${country.country}: ${pct}% of tracked markets\n`;
        });
        markdown += `\n`;
      }
    }
  }

  return markdown;
}

function formatHBMonthlyReportAsMarkdown(data: any): string {
  // Start with the standard monthly report formatting
  let markdown = formatMonthlyReportAsMarkdown(data);

  // Add report month information at the top using monthlyBusinessSummary
  // Note: monthlyExecutiveReport view is unreliable, so we use monthlyBusinessSummary as the source
  let reportMonthValue = data.monthlyBusinessSummary?.[0]?.month;

  if (reportMonthValue) {
    console.log('[HB Report] Raw report_month from monthlyBusinessSummary:', reportMonthValue);

    // Handle BigQuery date object or string
    let reportMonth: Date;
    if (reportMonthValue.value) {
      // BigQuery returns dates as { value: "2024-10-01" }
      reportMonth = new Date(reportMonthValue.value + 'T00:00:00');
    } else if (typeof reportMonthValue === 'string') {
      // If it's a string, append time to ensure local timezone
      reportMonth = new Date(reportMonthValue + 'T00:00:00');
    } else {
      reportMonth = new Date(reportMonthValue);
    }

    console.log('[HB Report] Parsed reportMonth date:', reportMonth);

    // Validate the date is valid
    if (!isNaN(reportMonth.getTime())) {
      const monthName = reportMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      console.log('[HB Report] Formatted month name:', monthName);
      markdown = `# REPORT MONTH: ${monthName}\n**CRITICAL: Use this month name in the H3 header at the start of the report**\n\n` + markdown;
    } else {
      console.error('[HB Report] Invalid date from report_month:', reportMonthValue);
    }
  } else {
    console.error('[HB Report] No report_month found in monthlyBusinessSummary');
  }

  // SIMPLIFIED: Platform-level metrics (ROAS, spend, revenue) are calculated by Claude
  // from the dailyPaidMediaByPlatform data in the base markdown. Claude sums the daily
  // rows for the report month to get totals and calculates ROAS as revenue/spend.
  // No pre-aggregated paidMediaPerformance or monthlyExecutiveReport data needed.

  // NOTE: Funnel ads section is now handled via client-side injection
  // The funnel ads data is still fetched and returned in the response,
  // but we don't include it in the markdown sent to Claude to avoid
  // issues with expired Facebook CDN image URLs

  console.log('[HB Report] Funnel ads will be injected client-side');
  if (data.funnelAds) {
    console.log('[HB Report] TOFU ads:', data.funnelAds['TOFU']?.length || 0);
    console.log('[HB Report] MOFU ads:', data.funnelAds['MOFU']?.length || 0);
    console.log('[HB Report] BOFU ads:', data.funnelAds['BOFU']?.length || 0);
  }

  return markdown;
}

function formatJumboMaxMonthlyReportAsMarkdown(data: any): string {
  console.log('[JumboMax Report] Starting formatting');

  // Start with the H&B report formatting (includes campaigns, products, paid media, funnel ads)
  // Note: Platform ROAS/spend/revenue is now calculated by Claude from dailyPaidMediaByPlatform
  let markdown = formatHBMonthlyReportAsMarkdown(data);

  // Add email revenue summary (by PURCHASE date - matches dashboard)
  if (data.emailPerformance?.[0]) {
    const email = data.emailPerformance[0];

    markdown += `\n## EMAIL REVENUE SUMMARY (By Purchase Date)\n`;
    markdown += `**USE THESE VALUES FOR TOTAL EMAIL REVENUE REPORTING:**\n\n`;
    markdown += `- **Total Email Revenue:** $${email.total_attributed_revenue?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Total Email Purchases:** ${email.total_attributed_purchases?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Total Email Purchasers:** ${email.total_attributed_purchasers?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Average Order Value:** $${email.avg_order_value?.toFixed(2) || 'N/A'}\n\n`;
  }

  // Email revenue by type (campaigns vs flows) - by PURCHASE date
  if (data.emailByType?.length > 0) {
    markdown += `\n## EMAIL REVENUE BY TYPE (Campaigns vs Flows)\n`;
    markdown += `**Revenue breakdown by email type (matches dashboard):**\n\n`;
    markdown += `| Type | Revenue | Purchases | Purchasers | AOV |\n`;
    markdown += `|------|---------|-----------|------------|-----|\n`;
    data.emailByType.forEach((type: any) => {
      markdown += `| ${type.email_type} | $${type.attributed_revenue?.toLocaleString() || 0} | ${type.purchases?.toLocaleString() || 0} | ${type.purchasers?.toLocaleString() || 0} | $${type.avg_order_value?.toFixed(2) || 0} |\n`;
    });
    markdown += `\n`;
  }

  // Email campaign send performance (by SEND date - engagement metrics)
  if (data.emailCampaignSendPerformance?.length > 0) {
    // Aggregate totals from individual campaigns (source of truth for campaign metrics)
    const totalSends = data.emailCampaignSendPerformance.reduce((sum: number, c: any) => sum + (c.sends || 0), 0);
    const totalUniqueOpens = data.emailCampaignSendPerformance.reduce((sum: number, c: any) => sum + (c.unique_opens || 0), 0);
    const totalUniqueClicks = data.emailCampaignSendPerformance.reduce((sum: number, c: any) => sum + (c.unique_clicks || 0), 0);
    const totalCampaignRevenue = data.emailCampaignSendPerformance.reduce((sum: number, c: any) => sum + (c.attributed_revenue || 0), 0);
    const weightedOpenRate = totalSends > 0 ? (totalUniqueOpens / totalSends * 100).toFixed(2) : '0';
    const weightedClickRate = totalSends > 0 ? (totalUniqueClicks / totalSends * 100).toFixed(2) : '0';

    markdown += `\n## CAMPAIGN PERFORMANCE SUMMARY (Aggregated from Send Data)\n`;
    markdown += `**USE THESE VALUES FOR CAMPAIGN TOTALS - aggregated from individual campaigns below:**\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Campaigns | ${data.emailCampaignSendPerformance.length} |\n`;
    markdown += `| Total Sends | ${totalSends.toLocaleString()} |\n`;
    markdown += `| Total Unique Opens | ${totalUniqueOpens.toLocaleString()} |\n`;
    markdown += `| Total Unique Clicks | ${totalUniqueClicks.toLocaleString()} |\n`;
    markdown += `| Weighted Open Rate | ${weightedOpenRate}% |\n`;
    markdown += `| Weighted Click Rate | ${weightedClickRate}% |\n`;
    markdown += `| Total Campaign Revenue | $${totalCampaignRevenue.toLocaleString()} |\n`;
    markdown += `\n`;

    markdown += `\n## EMAIL CAMPAIGN SEND PERFORMANCE (Individual Campaigns)\n`;
    markdown += `**Campaign engagement metrics (by send date):**\n\n`;
    markdown += `| Campaign Name | Send Date | Sends | Opens | Clicks | Open Rate | Click Rate | Revenue |\n`;
    markdown += `|---------------|-----------|-------|-------|--------|-----------|------------|--------|\n`;
    data.emailCampaignSendPerformance.forEach((campaign: any) => {
      const sendDate = campaign.send_date?.value || campaign.send_date;
      markdown += `| ${campaign.campaign_name} | ${sendDate} | ${campaign.sends?.toLocaleString() || 0} | ${campaign.unique_opens?.toLocaleString() || 0} | ${campaign.unique_clicks?.toLocaleString() || 0} | ${campaign.open_rate_pct || 0}% | ${campaign.click_rate_pct || 0}% | $${campaign.attributed_revenue?.toLocaleString() || 0} |\n`;
    });
    markdown += `\n`;
  }

  // Top campaign revenue breakdown
  if (data.emailCampaignRevenue?.length > 0) {
    markdown += `\n## TOP EMAIL CAMPAIGNS BY REVENUE\n`;
    markdown += `| Campaign Name | Revenue | Purchases | Purchasers | AOV |\n`;
    markdown += `|---------------|---------|-----------|------------|-----|\n`;
    data.emailCampaignRevenue.slice(0, 10).forEach((campaign: any) => {
      markdown += `| ${campaign.campaign_name} | $${campaign.attributed_revenue?.toLocaleString() || 0} | ${campaign.attributed_purchases?.toLocaleString() || 0} | ${campaign.attributed_purchasers?.toLocaleString() || 0} | $${campaign.avg_order_value?.toFixed(2) || 0} |\n`;
    });
    markdown += `\n`;
  }

  // Detailed flow revenue breakdown
  if (data.flowRevenue?.length > 0) {
    markdown += `\n## FLOW REVENUE BREAKDOWN (Detailed by Flow)\n`;
    markdown += `**Individual Flow Performance:**\n\n`;
    markdown += `| Flow Name | Category | Revenue | Purchases | Purchasers | AOV | Revenue/Purchaser |\n`;
    markdown += `|-----------|----------|---------|-----------|------------|-----|-------------------|\n`;
    data.flowRevenue.forEach((flow: any) => {
      markdown += `| ${flow.flow_name} | ${flow.flow_category || 'N/A'} | $${flow.attributed_revenue?.toLocaleString() || 0} | ${flow.attributed_purchases?.toLocaleString() || 0} | ${flow.attributed_purchasers?.toLocaleString() || 0} | $${flow.avg_order_value?.toFixed(2) || 0} | $${flow.revenue_per_purchaser?.toFixed(2) || 0} |\n`;
    });

    // Add summary metrics
    const totalFlowRevenue = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_revenue || 0), 0);
    const totalFlowPurchases = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_purchases || 0), 0);
    const totalFlowPurchasers = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_purchasers || 0), 0);

    markdown += `\n**Flow Summary:**\n`;
    markdown += `- Total Flow Revenue: $${totalFlowRevenue?.toLocaleString() || 0}\n`;
    markdown += `- Total Flow Purchases: ${totalFlowPurchases?.toLocaleString() || 0}\n`;
    markdown += `- Total Flow Purchasers: ${totalFlowPurchasers?.toLocaleString() || 0}\n`;
    markdown += `- Active Flows: ${data.flowRevenue.length}\n\n`;
  }

  // ========================================
  // YoY EMAIL DATA (Same Month, Previous Year)
  // ========================================
  if (data.yoyEmailPerformance?.[0] || data.yoyEmailByType?.length > 0) {
    markdown += `\n## YoY EMAIL COMPARISON DATA (Same Month, Previous Year)\n`;
    markdown += `**Use this data for year-over-year email performance comparisons:**\n\n`;

    // YoY Email totals
    if (data.yoyEmailPerformance?.[0]) {
      const yoyEmail = data.yoyEmailPerformance[0];
      markdown += `### YoY Email Revenue Summary\n`;
      markdown += `| Metric | YoY Value |\n`;
      markdown += `|--------|----------|\n`;
      markdown += `| Total Email Revenue | $${yoyEmail.total_attributed_revenue?.toLocaleString() || 'N/A'} |\n`;
      markdown += `| Total Email Purchases | ${yoyEmail.total_attributed_purchases?.toLocaleString() || 'N/A'} |\n`;
      markdown += `| Total Email Purchasers | ${yoyEmail.total_attributed_purchasers?.toLocaleString() || 'N/A'} |\n`;
      markdown += `| Average Order Value | $${yoyEmail.avg_order_value?.toFixed(2) || 'N/A'} |\n`;
      markdown += `\n`;
    }

    // YoY Email by type
    if (data.yoyEmailByType?.length > 0) {
      markdown += `### YoY Email Revenue by Type\n`;
      markdown += `| Type | Revenue | Purchases | Purchasers | AOV |\n`;
      markdown += `|------|---------|-----------|------------|-----|\n`;
      data.yoyEmailByType.forEach((type: any) => {
        markdown += `| ${type.email_type} | $${type.attributed_revenue?.toLocaleString() || 0} | ${type.purchases?.toLocaleString() || 0} | ${type.purchasers?.toLocaleString() || 0} | $${type.avg_order_value?.toFixed(2) || 0} |\n`;
      });
      markdown += `\n`;
    }

    // YoY Campaign revenue
    if (data.yoyEmailCampaignRevenue?.length > 0) {
      markdown += `### YoY Top Email Campaigns\n`;
      markdown += `| Campaign Name | Revenue | Purchases | AOV |\n`;
      markdown += `|---------------|---------|-----------|-----|\n`;
      data.yoyEmailCampaignRevenue.slice(0, 10).forEach((campaign: any) => {
        markdown += `| ${campaign.campaign_name} | $${campaign.attributed_revenue?.toLocaleString() || 0} | ${campaign.attributed_purchases?.toLocaleString() || 0} | $${campaign.avg_order_value?.toFixed(2) || 0} |\n`;
      });
      markdown += `\n`;
    }

    // YoY Flow revenue
    if (data.yoyFlowRevenue?.length > 0) {
      const yoyTotalFlowRevenue = data.yoyFlowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_revenue || 0), 0);
      const yoyTotalFlowPurchases = data.yoyFlowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_purchases || 0), 0);

      markdown += `### YoY Flow Revenue Summary\n`;
      markdown += `| Metric | YoY Value |\n`;
      markdown += `|--------|----------|\n`;
      markdown += `| Total Flow Revenue | $${yoyTotalFlowRevenue?.toLocaleString() || 0} |\n`;
      markdown += `| Total Flow Purchases | ${yoyTotalFlowPurchases?.toLocaleString() || 0} |\n`;
      markdown += `| Active Flows | ${data.yoyFlowRevenue.length} |\n`;
      markdown += `\n`;
    }
  }

  return markdown;
}

function formatPuttOutMonthlyReportAsMarkdown(data: any): string {
  // Start with the base monthly report formatting
  let markdown = formatMonthlyReportAsMarkdown(data);

  // Add report month information at the top using monthlyBusinessSummary
  let reportMonthValue = data.monthlyBusinessSummary?.[0]?.month;

  if (reportMonthValue) {
    console.log('[PuttOUT Report] Raw report_month from monthlyBusinessSummary:', reportMonthValue);

    // Handle BigQuery date object or string
    let reportMonth: Date;
    if (reportMonthValue.value) {
      // BigQuery returns dates as { value: "2024-10-01" }
      reportMonth = new Date(reportMonthValue.value + 'T00:00:00');
    } else if (typeof reportMonthValue === 'string') {
      // If it's a string, append time to ensure local timezone
      reportMonth = new Date(reportMonthValue + 'T00:00:00');
    } else {
      reportMonth = new Date(reportMonthValue);
    }

    // Validate the date is valid
    if (!isNaN(reportMonth.getTime())) {
      const monthName = reportMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      markdown = `# REPORT MONTH: ${monthName}\n**CRITICAL: Use this month name in the H3 header at the start of the report**\n\n` + markdown;
    } else {
      console.error('[PuttOUT Report] Invalid date from report_month:', reportMonthValue);
    }
  } else {
    console.error('[PuttOUT Report] No report_month found in monthlyBusinessSummary');
  }

  // SIMPLIFIED: Platform-level metrics (ROAS, spend, revenue) are calculated by Claude
  // from the dailyPaidMediaByPlatform data in the base markdown. Claude sums the daily
  // rows for the report month to get totals and calculates ROAS as revenue/spend.
  // PuttOut only uses Meta (Facebook) - no Google Ads.

  // Add email revenue summary (by PURCHASE date - matches dashboard)
  if (data.emailPerformance?.[0]) {
    const email = data.emailPerformance[0];

    markdown += `\n## EMAIL REVENUE SUMMARY (By Purchase Date)\n`;
    markdown += `**USE THESE VALUES FOR TOTAL EMAIL REVENUE REPORTING:**\n\n`;
    markdown += `- **Total Email Revenue:** $${email.total_attributed_revenue?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Total Email Purchases:** ${email.total_attributed_purchases?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Total Email Purchasers:** ${email.total_attributed_purchasers?.toLocaleString() || 'N/A'}\n`;
    markdown += `- **Average Order Value:** $${email.avg_order_value?.toFixed(2) || 'N/A'}\n\n`;
  }

  // Email revenue by type (campaigns vs flows) - by PURCHASE date
  if (data.emailByType?.length > 0) {
    markdown += `\n## EMAIL REVENUE BY TYPE (Campaigns vs Flows)\n`;
    markdown += `**Revenue breakdown by email type (matches dashboard):**\n\n`;
    markdown += `| Type | Revenue | Purchases | Purchasers | AOV |\n`;
    markdown += `|------|---------|-----------|------------|-----|\n`;
    data.emailByType.forEach((type: any) => {
      markdown += `| ${type.email_type} | $${type.attributed_revenue?.toLocaleString() || 0} | ${type.purchases?.toLocaleString() || 0} | ${type.purchasers?.toLocaleString() || 0} | $${type.avg_order_value?.toFixed(2) || 0} |\n`;
    });
    markdown += `\n`;
  }

  // Detailed flow revenue breakdown
  if (data.flowRevenue?.length > 0) {
    markdown += `\n## FLOW REVENUE BREAKDOWN (Detailed by Flow)\n`;
    markdown += `**Individual Flow Performance:**\n\n`;
    markdown += `| Flow Name | Category | Revenue | Purchases | Purchasers | AOV | Revenue/Purchaser |\n`;
    markdown += `|-----------|----------|---------|-----------|------------|-----|-------------------|\n`;
    data.flowRevenue.forEach((flow: any) => {
      markdown += `| ${flow.flow_name} | ${flow.flow_category || 'N/A'} | $${flow.attributed_revenue?.toLocaleString() || 0} | ${flow.attributed_purchases?.toLocaleString() || 0} | ${flow.attributed_purchasers?.toLocaleString() || 0} | $${flow.avg_order_value?.toFixed(2) || 0} | $${flow.revenue_per_purchaser?.toFixed(2) || 0} |\n`;
    });

    // Add summary metrics
    const totalFlowRevenue = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_revenue || 0), 0);
    const totalFlowPurchases = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_purchases || 0), 0);
    const totalFlowPurchasers = data.flowRevenue.reduce((sum: number, flow: any) => sum + (flow.attributed_purchasers || 0), 0);

    markdown += `\n**Flow Summary:**\n`;
    markdown += `- Total Flow Revenue: $${totalFlowRevenue?.toLocaleString() || 0}\n`;
    markdown += `- Total Flow Purchases: ${totalFlowPurchases?.toLocaleString() || 0}\n`;
    markdown += `- Total Flow Purchasers: ${totalFlowPurchasers?.toLocaleString() || 0}\n`;
    markdown += `- Active Flows: ${data.flowRevenue.length}\n\n`;
  }

  return markdown;
}
