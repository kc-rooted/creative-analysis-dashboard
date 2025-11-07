import { NextResponse } from 'next/server';
import { runSQLQuery } from '@/lib/bigquery';

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

    // Map client to dataset
    const clientDatasetMap: Record<string, string> = {
      'jumbomax': 'jumbomax_analytics',
      'puttout': 'puttout_analytics',
      'hb': 'hb_analytics'
    };

    const dataset = clientDatasetMap[clientId] || 'jumbomax_analytics';
    const projectId = 'intelligence-451803';

    // Calculate date range based on period
    const dateRange = getPeriodDateRange(period);

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

    return NextResponse.json({
      success: true,
      reportType,
      clientId,
      period,
      dateRange,
      data: reportData,
      formattedData, // Add formatted markdown version
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

    // Top products
    topProducts: `
      SELECT
        product_name,
        SUM(quantity) as units_sold,
        SUM(revenue) as revenue
      FROM \`${projectId}.${dataset}.product_performance\`
      WHERE ${dateRange.sql}
      GROUP BY product_name
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
    // 1. Monthly Executive Report - Hero metrics with MoM and YoY
    monthlyExecutiveReport: `
      SELECT
        report_month,
        revenue_total,
        revenue_mom_pct,
        revenue_yoy_pct,
        blended_roas,
        blended_roas_mom_pct,
        blended_roas_yoy_pct,
        paid_spend_total as paid_media_spend,
        paid_spend_mom_pct as paid_media_spend_mom_pct,
        paid_spend_yoy_pct as paid_media_spend_yoy_pct,
        meta_spend,
        meta_spend_mom_pct,
        meta_spend_yoy_pct,
        meta_revenue,
        meta_revenue_mom_pct,
        meta_revenue_yoy_pct,
        meta_roas,
        meta_roas_mom_pct,
        meta_roas_yoy_pct,
        google_spend,
        google_spend_mom_pct,
        google_spend_yoy_pct,
        google_revenue,
        google_revenue_mom_pct,
        google_revenue_yoy_pct,
        google_roas,
        google_roas_mom_pct,
        google_roas_yoy_pct,
        top_emerging_product_title,
        top_emerging_product_revenue,
        top_emerging_product_growth_pct as top_emerging_product_mom_growth_pct,
        top_emerging_product_category
      FROM \`${projectId}.${dataset}.monthly_executive_report\`
      ORDER BY report_month DESC
      LIMIT 1
    `,

    // 2. Executive Summary - Only essential MTD metrics (kept for backwards compatibility)
    executiveSummary: `
      SELECT
        revenue_mtd,
        orders_mtd,
        aov_mtd,
        revenue_mtd_yoy_growth_pct,
        orders_mtd_yoy_growth_pct,
        facebook_spend_mtd,
        facebook_revenue_mtd,
        facebook_roas_mtd,
        facebook_spend_7d,
        facebook_revenue_7d,
        facebook_roas_7d,
        google_spend_mtd,
        google_revenue_mtd,
        google_roas_mtd,
        klaviyo_total_revenue_mtd,
        klaviyo_total_revenue_mtd_yoy_growth_pct,
        revenue_7d,
        orders_7d,
        aov_7d
      FROM \`${projectId}.${dataset}.ai_executive_summary\`
      ORDER BY report_date DESC
      LIMIT 1
    `,

    // 2. Monthly Business Summary - Core metrics only
    // NOTE: Filter to previous complete month to match monthly_executive_report
    monthlyBusinessSummary: `
      SELECT
        month,
        monthly_gross_sales,
        monthly_net_sales_after_refunds,
        monthly_orders,
        avg_monthly_aov,
        total_sales_roas,
        attributed_blended_roas,
        monthly_ad_spend,
        monthly_facebook_spend,
        monthly_google_spend
      FROM \`${projectId}.${dataset}.monthly_business_summary\`
      WHERE month < DATE_TRUNC(CURRENT_DATE(), MONTH)
      ORDER BY month DESC
      LIMIT 1
    `,

    // 3. Top 10 Campaigns by ROAS + Bottom 5 by ROAS
    topCampaigns: `
      SELECT
        campaign_name,
        spend_30d,
        revenue_30d,
        roas_30d,
        ctr_30d,
        purchases_30d,
        recommended_action,
        risk_flags
      FROM \`${projectId}.${dataset}.ai_intelligent_campaign_analysis\`
      ORDER BY roas_30d DESC
      LIMIT 10
    `,

    bottomCampaigns: `
      SELECT
        campaign_name,
        spend_30d,
        revenue_30d,
        roas_30d,
        ctr_30d,
        purchases_30d,
        recommended_action,
        risk_flags
      FROM \`${projectId}.${dataset}.ai_intelligent_campaign_analysis\`
      WHERE roas_30d IS NOT NULL
      ORDER BY roas_30d ASC
      LIMIT 5
    `,

    // 4. Top 10 Products only, key metrics
    productIntelligence: `
      SELECT
        product_title,
        revenue_30d,
        units_sold_30d,
        total_inventory_quantity,
        avg_variant_price,
        performance_category_30d
      FROM \`${projectId}.${dataset}.product_intelligence\`
      ORDER BY revenue_30d DESC
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

    // 7. Daily Performance Progression - Revenue and ROAS by day for the month
    dailyPerformance: `
      SELECT
        date,
        spend,
        revenue,
        ROUND(revenue / NULLIF(spend, 0), 2) as roas,
        orders
      FROM \`${projectId}.${dataset}.paid_media_performance\`
      WHERE date >= '${dateRange.start}' AND date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      ORDER BY date ASC
    `,

    // 8. Country Performance - Revenue and units by key markets (US, Canada, UK)
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
 */
async function fetchHBMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  // First, get all the standard monthly performance data
  const baseData = await fetchMonthlyPerformanceData(projectId, dataset, dateRange);

  // Add H&B-specific paid media performance metrics (Meta & Google Ads)
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

  // Add H&B-specific country performance with Meta attribution
  const countryPerformanceEnhancedQuery = `
    WITH meta_country_monthly AS (
      SELECT
        CASE
          WHEN country = 'US' THEN 'United States'
          WHEN country = 'CA' THEN 'Canada'
          WHEN country = 'GB' THEN 'United Kingdom'
          ELSE country
        END as country_name,
        CASE
          WHEN country = 'US' THEN 'US'
          WHEN country = 'CA' THEN 'CA'
          WHEN country = 'GB' THEN 'GB'
          ELSE country
        END as country_code,
        FORMAT_DATE('%Y-%m', date_start) as year_month,
        SUM(spend) as meta_spend,
        SUM(
          CAST(
            JSON_EXTRACT_SCALAR(action_value, '$.value') AS FLOAT64
          )
        ) as meta_revenue
      FROM \`clients_hb.facebook_ads_insights_country\`,
        UNNEST(JSON_EXTRACT_ARRAY(action_values)) as action_value
      WHERE JSON_EXTRACT_SCALAR(action_value, '$.action_type') IN ('omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase')
      GROUP BY country_name, country_code, year_month
    ),
    geo_product_agg AS (
      SELECT
        country,
        country_code,
        year_month,
        SUM(total_revenue) as total_revenue,
        SUM(total_units_sold) as total_units_sold,
        AVG(avg_unit_price) as avg_unit_price
      FROM \`${projectId}.${dataset}.geographic_product_performance\`
      GROUP BY country, country_code, year_month
    )
    SELECT
      g.country,
      g.country_code,
      g.year_month,
      g.total_revenue,
      g.total_units_sold,
      ROUND(g.avg_unit_price, 2) as avg_unit_price,
      COALESCE(m.meta_revenue, 0) as meta_attributed_revenue,
      COALESCE(m.meta_spend, 0) as meta_spend,
      ROUND(SAFE_DIVIDE(m.meta_revenue, m.meta_spend), 2) as meta_roas
    FROM geo_product_agg g
    LEFT JOIN meta_country_monthly m
      ON g.country_code = m.country_code
      AND g.year_month = m.year_month
    WHERE g.year_month = FORMAT_DATE('%Y-%m', DATE '${dateRange.start}')
      AND g.country_code IN ('US', 'CA', 'GB')
    ORDER BY g.total_revenue DESC
  `;

  try {
    const countryData = await runSQLQuery(countryPerformanceEnhancedQuery);
    console.log(`[Report Data] countryPerformance (enhanced): ${countryData.length} rows fetched`);
    baseData.countryPerformance = countryData;
  } catch (error) {
    console.error('[Report Data] Error fetching enhanced country performance:', error);
    baseData.countryPerformance = [];
  }

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
 * Fetch data for JumboMax Monthly Performance Review (extends H&B with email performance)
 */
async function fetchJumboMaxMonthlyPerformanceData(projectId: string, dataset: string, dateRange: any) {
  // First, get all the H&B report data (includes base metrics, paid media, funnel ads)
  const baseData = await fetchHBMonthlyPerformanceData(projectId, dataset, dateRange);

  // Add JumboMax-specific email performance from klaviyo_email_engagement_trends
  const emailPerformanceQuery = `
    SELECT
      SUM(sends) as total_sends,
      SUM(deliveries) as total_deliveries,
      SUM(opens) as total_opens,
      SUM(clicks) as total_clicks,
      SUM(bounces) as total_bounces,
      SUM(unsubscribes) as total_unsubscribes,
      SUM(unique_recipients_sent) as unique_recipients_sent,
      SUM(unique_recipients_opened) as unique_recipients_opened,
      SUM(unique_recipients_clicked) as unique_recipients_clicked,
      SUM(campaigns_sent) as campaigns_sent,
      SUM(attributed_revenue) as total_attributed_revenue,
      SUM(attributed_purchases) as total_attributed_purchases,
      SUM(attributed_purchasers) as total_attributed_purchasers,
      AVG(delivery_rate) as avg_delivery_rate,
      AVG(open_rate) as avg_open_rate,
      AVG(click_rate) as avg_click_rate,
      AVG(click_to_open_rate) as avg_click_to_open_rate,
      AVG(bounce_rate) as avg_bounce_rate,
      AVG(unsubscribe_rate) as avg_unsubscribe_rate,
      AVG(unique_open_rate) as avg_unique_open_rate,
      AVG(unique_click_rate) as avg_unique_click_rate,
      AVG(purchase_conversion_rate) as avg_purchase_conversion_rate,
      AVG(revenue_per_send) as avg_revenue_per_send
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
  `;

  // Email performance by campaign category
  const emailByCategoryQuery = `
    SELECT
      campaign_category,
      SUM(sends) as sends,
      SUM(opens) as opens,
      SUM(clicks) as clicks,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(open_rate) as open_rate,
      AVG(click_rate) as click_rate,
      AVG(click_to_open_rate) as click_to_open_rate
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND campaign_category IS NOT NULL
    GROUP BY campaign_category
    ORDER BY attributed_revenue DESC
  `;

  // Email performance by type (campaign vs flow)
  const emailByTypeQuery = `
    SELECT
      email_type,
      SUM(sends) as sends,
      SUM(opens) as opens,
      SUM(clicks) as clicks,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(open_rate) as open_rate,
      AVG(click_rate) as click_rate
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND email_type IS NOT NULL
    GROUP BY email_type
    ORDER BY attributed_revenue DESC
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
    const emailByCategory = await runSQLQuery(emailByCategoryQuery);
    console.log(`[Report Data] emailByCategory: ${emailByCategory.length} rows fetched`);
    baseData.emailByCategory = emailByCategory;
  } catch (error) {
    console.error('[Report Data] Error fetching email by category:', error);
    baseData.emailByCategory = [];
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
 * Fetch data for PuttOUT Monthly Performance Review
 * Similar to JumboMax but without Google Ads detailed breakouts and funnel ads
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

  // Add email performance from klaviyo_email_engagement_trends
  const emailPerformanceQuery = `
    SELECT
      SUM(sends) as total_sends,
      SUM(deliveries) as total_deliveries,
      SUM(opens) as total_opens,
      SUM(clicks) as total_clicks,
      SUM(bounces) as total_bounces,
      SUM(unsubscribes) as total_unsubscribes,
      SUM(unique_recipients_sent) as unique_recipients_sent,
      SUM(unique_recipients_opened) as unique_recipients_opened,
      SUM(unique_recipients_clicked) as unique_recipients_clicked,
      SUM(campaigns_sent) as campaigns_sent,
      SUM(attributed_revenue) as total_attributed_revenue,
      SUM(attributed_purchases) as total_attributed_purchases,
      SUM(attributed_purchasers) as total_attributed_purchasers,
      AVG(delivery_rate) as avg_delivery_rate,
      AVG(open_rate) as avg_open_rate,
      AVG(click_rate) as avg_click_rate,
      AVG(click_to_open_rate) as avg_click_to_open_rate,
      AVG(bounce_rate) as avg_bounce_rate,
      AVG(unsubscribe_rate) as avg_unsubscribe_rate,
      AVG(unique_open_rate) as avg_unique_open_rate,
      AVG(unique_click_rate) as avg_unique_click_rate,
      AVG(purchase_conversion_rate) as avg_purchase_conversion_rate,
      AVG(revenue_per_send) as avg_revenue_per_send
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
  `;

  // Email performance by campaign category
  const emailByCategoryQuery = `
    SELECT
      campaign_category,
      SUM(sends) as sends,
      SUM(opens) as opens,
      SUM(clicks) as clicks,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(open_rate) as open_rate,
      AVG(click_rate) as click_rate,
      AVG(click_to_open_rate) as click_to_open_rate
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND campaign_category IS NOT NULL
    GROUP BY campaign_category
    ORDER BY attributed_revenue DESC
  `;

  // Email performance by type (campaign vs flow)
  const emailByTypeQuery = `
    SELECT
      email_type,
      SUM(sends) as sends,
      SUM(opens) as opens,
      SUM(clicks) as clicks,
      SUM(attributed_revenue) as attributed_revenue,
      AVG(open_rate) as open_rate,
      AVG(click_rate) as click_rate
    FROM \`${projectId}.${dataset}.klaviyo_email_engagement_trends\`
    WHERE event_date >= '${dateRange.start}' AND event_date < DATE_ADD(DATE '${dateRange.start}', INTERVAL 1 MONTH)
      AND email_type IS NOT NULL
    GROUP BY email_type
    ORDER BY attributed_revenue DESC
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
    const emailByCategory = await runSQLQuery(emailByCategoryQuery);
    console.log(`[Report Data] emailByCategory: ${emailByCategory.length} rows fetched`);
    baseData.emailByCategory = emailByCategory;
  } catch (error) {
    console.error('[Report Data] Error fetching email by category:', error);
    baseData.emailByCategory = [];
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
  if (reportType === 'jumbomax-monthly-performance') {
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
  markdown += `Review the DAILY PERFORMANCE PROGRESSION and COUNTRY PERFORMANCE tables (at the bottom of this data) to analyze:\n`;
  markdown += `1. Daily trends - how ROAS evolved throughout the month\n`;
  markdown += `2. Geographic breakdown - revenue distribution across US, Canada, and UK markets\n`;
  markdown += `3. Meta attribution by country - which markets drive the strongest Meta ROAS (H&B only)\n`;
  markdown += `Include insights about ROAS trends, geographic performance, and Meta attribution in your Executive Summary bullet points.\n\n`;
  markdown += `---\n\n`;

  // Hero Metrics from Monthly Executive Report (NEW)
  if (data.monthlyExecutiveReport?.[0]) {
    const hero = data.monthlyExecutiveReport[0];
    markdown += `## HERO METRICS (for Executive Summary)\n`;
    markdown += `**Use these 6 metrics EXACTLY as specified in the prompt:**\n\n`;

    markdown += `**Row 1 - Monthly Revenue**:\n`;
    markdown += `- revenue_total: $${hero.revenue_total?.toLocaleString() || 'N/A'}\n`;
    markdown += `- revenue_mom_pct: ${hero.revenue_mom_pct?.toFixed(1) || 0}%\n`;
    markdown += `- revenue_yoy_pct: ${hero.revenue_yoy_pct?.toFixed(1) || 0}%\n\n`;

    markdown += `**Row 3 - Monthly ROAS**:\n`;
    markdown += `- blended_roas: ${hero.blended_roas?.toFixed(2) || 'N/A'}x\n`;
    markdown += `- blended_roas_mom_pct: ${hero.blended_roas_mom_pct?.toFixed(1) || 0}%\n`;
    markdown += `- blended_roas_yoy_pct: ${hero.blended_roas_yoy_pct?.toFixed(1) || 0}%\n\n`;

    markdown += `**Row 4 - Paid Media Spend**:\n`;
    markdown += `- paid_media_spend: $${hero.paid_media_spend?.toLocaleString() || 'N/A'}\n`;
    markdown += `- paid_media_spend_mom_pct: ${hero.paid_media_spend_mom_pct?.toFixed(1) || 0}%\n`;
    markdown += `- paid_media_spend_yoy_pct: ${hero.paid_media_spend_yoy_pct?.toFixed(1) || 0}%\n\n`;

    markdown += `**Row 6 - Top Emerging SKU**:\n`;
    markdown += `- top_emerging_product_title: ${hero.top_emerging_product_title || 'N/A'}\n`;
    markdown += `- top_emerging_product_revenue: $${hero.top_emerging_product_revenue?.toLocaleString() || 'N/A'}\n`;
    markdown += `- top_emerging_product_mom_growth_pct: ${hero.top_emerging_product_mom_growth_pct?.toFixed(1) || 0}%\n\n`;
  }

  // Annual Revenue Forecast (Bayesian)
  if (data.bayesianForecast?.[0]) {
    const forecast = data.bayesianForecast[0];
    markdown += `## ANNUAL REVENUE FORECAST (for Hero Metric Row 2)\n`;
    markdown += `**Use these fields for Annual Revenue Pacing row:**\n\n`;

    markdown += `**Row 2 - Annual Revenue Pacing**:\n`;
    markdown += `- prophet_annual_revenue_base (Base Scenario forecast): $${forecast.prophet_annual_revenue_base?.toLocaleString() || 'N/A'}\n`;
    markdown += `- annual_revenue_target (Target): $${forecast.annual_revenue_target?.toLocaleString() || 'N/A'}\n`;
    markdown += `- probability_hit_revenue_target: ${forecast.probability_hit_revenue_target}%\n`;
    markdown += `- days_remaining: ${forecast.days_remaining}\n`;
    markdown += `- CALCULATE SHORTFALL: annual_revenue_target MINUS prophet_annual_revenue_base\n\n`;

    markdown += `**Additional Context** (for reference only):\n`;
    markdown += `- Forecast Year: ${forecast.forecast_year}\n`;
    markdown += `- YTD Revenue: $${parseFloat(forecast.ytd_revenue)?.toLocaleString() || 'N/A'}\n`;
    markdown += `- YTD Attainment: ${forecast.ytd_attainment_pct?.toFixed(1) || 0}%\n`;
    markdown += `- Conservative Scenario: $${forecast.prophet_annual_revenue_conservative?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Optimistic Scenario: $${forecast.prophet_annual_revenue_optimistic?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Risk Level: ${forecast.revenue_risk_level}\n\n`;
  }

  // Executive Summary (MTD - for detailed breakdown)
  if (data.executiveSummary?.[0]) {
    const exec = data.executiveSummary[0];
    markdown += `## Platform Breakdown (MTD)\n`;
    markdown += `- Revenue: $${exec.revenue_mtd?.toLocaleString() || 'N/A'} | Orders: ${exec.orders_mtd || 'N/A'} | AOV: $${exec.aov_mtd?.toFixed(2) || 'N/A'}\n`;
    markdown += `- YoY Growth: Revenue ${exec.revenue_mtd_yoy_growth_pct || 0 > 0 ? '+' : ''}${exec.revenue_mtd_yoy_growth_pct?.toFixed(1) || 0}% | Orders ${exec.orders_mtd_yoy_growth_pct || 0 > 0 ? '+' : ''}${exec.orders_mtd_yoy_growth_pct?.toFixed(1) || 0}%\n`;

    if (exec.facebook_spend_mtd > 0) {
      markdown += `\n### Facebook MTD\n`;
      markdown += `- Spend: $${exec.facebook_spend_mtd?.toLocaleString() || 'N/A'} | Revenue: $${exec.facebook_revenue_mtd?.toLocaleString() || 'N/A'} | ROAS: ${exec.facebook_roas_mtd?.toFixed(2) || 'N/A'}x\n`;
      markdown += `- 7D: Spend $${exec.facebook_spend_7d?.toLocaleString() || 'N/A'} | Revenue $${exec.facebook_revenue_7d?.toLocaleString() || 'N/A'} | ROAS ${exec.facebook_roas_7d?.toFixed(2) || 'N/A'}x\n`;
    }

    if (exec.google_spend_mtd > 0) {
      markdown += `\n### Google Ads MTD\n`;
      markdown += `- Spend: $${exec.google_spend_mtd?.toLocaleString() || 'N/A'} | Revenue: $${exec.google_revenue_mtd?.toLocaleString() || 'N/A'} | ROAS: ${exec.google_roas_mtd?.toFixed(2) || 'N/A'}x\n`;
    }

    if (exec.klaviyo_total_revenue_mtd > 0) {
      markdown += `\n### Email MTD\n`;
      markdown += `- Revenue: $${exec.klaviyo_total_revenue_mtd?.toLocaleString() || 'N/A'} | YoY: ${exec.klaviyo_total_revenue_mtd_yoy_growth_pct || 0 > 0 ? '+' : ''}${exec.klaviyo_total_revenue_mtd_yoy_growth_pct?.toFixed(1) || 0}%\n`;
    }

    markdown += `\n### Last 7 Days\n`;
    markdown += `- Revenue: $${exec.revenue_7d?.toLocaleString() || 'N/A'} | Orders: ${exec.orders_7d || 'N/A'} | AOV: $${exec.aov_7d?.toFixed(2) || 'N/A'}\n`;
  }

  // Monthly Business Summary
  if (data.monthlyBusinessSummary?.[0]) {
    const monthly = data.monthlyBusinessSummary[0];
    markdown += `\n## Monthly Business Metrics\n`;
    markdown += `- Gross Sales: $${monthly.monthly_gross_sales?.toLocaleString() || 'N/A'} | Net Sales (after refunds): $${monthly.monthly_net_sales_after_refunds?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Total Orders: ${monthly.monthly_orders || 'N/A'} | AOV: $${monthly.avg_monthly_aov?.toFixed(2) || 'N/A'}\n`;
    markdown += `- Total Sales ROAS: ${monthly.total_sales_roas?.toFixed(2) || 'N/A'}x | Attributed Blended ROAS: ${monthly.attributed_blended_roas?.toFixed(2) || 'N/A'}x\n`;
    markdown += `- Total Ad Spend: $${monthly.monthly_ad_spend?.toLocaleString() || 'N/A'} (FB: $${monthly.monthly_facebook_spend?.toLocaleString() || 0}, Google: $${monthly.monthly_google_spend?.toLocaleString() || 0})\n`;
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

  // Top Campaigns
  if (data.topCampaigns?.length > 0) {
    markdown += `\n## Top 10 Campaigns by ROAS\n`;
    markdown += `| Campaign | Spend | Revenue | ROAS | CTR | Purchases |\n`;
    markdown += `|----------|-------|---------|------|-----|--------|\n`;
    data.topCampaigns.forEach((c: any) => {
      markdown += `| ${c.campaign_name} | $${c.spend_30d?.toLocaleString() || 0} | $${c.revenue_30d?.toLocaleString() || 0} | ${c.roas_30d?.toFixed(2) || 0}x | ${(c.ctr_30d * 100)?.toFixed(2) || 0}% | ${c.purchases_30d || 0} |\n`;
    });
  }

  // Bottom Campaigns
  if (data.bottomCampaigns?.length > 0) {
    markdown += `\n## Bottom 5 Campaigns Needing Attention\n`;
    markdown += `| Campaign | Spend | Revenue | ROAS | Action | Flags |\n`;
    markdown += `|----------|-------|---------|------|--------|-------|\n`;
    data.bottomCampaigns.forEach((c: any) => {
      markdown += `| ${c.campaign_name} | $${c.spend_30d?.toLocaleString() || 0} | $${c.revenue_30d?.toLocaleString() || 0} | ${c.roas_30d?.toFixed(2) || 0}x | ${c.recommended_action || 'N/A'} | ${c.risk_flags || 'None'} |\n`;
    });
  }

  // Products - WITH EXPLICIT ROW 5 HERO METRIC
  if (data.productIntelligence?.length > 0) {
    markdown += `\n## TOP PERFORMING SKU (for Hero Metric Row 5)\n`;
    markdown += `**Row 5 - Top Performing SKU**:\n`;
    markdown += `- product_title: ${data.productIntelligence[0].product_title}\n`;
    markdown += `- revenue_30d: $${data.productIntelligence[0].revenue_30d?.toLocaleString() || 0}\n\n`;

    markdown += `**All Top 10 Products** (for context):\n`;
    markdown += `| Product | Revenue (30d) | Units Sold | Inventory |\n`;
    markdown += `|---------|---------------|------------|----------|\n`;
    data.productIntelligence.forEach((p: any) => {
      markdown += `| ${p.product_title} | $${p.revenue_30d?.toLocaleString() || 0} | ${p.units_sold_30d || 0} | ${p.total_inventory_quantity || 0} |\n`;
    });
  }

  // Daily Performance Progression - Show ROAS and Revenue trends throughout the month
  if (data.dailyPerformance?.length > 0) {
    markdown += `\n## DAILY PERFORMANCE PROGRESSION\n`;
    markdown += `**Use this data to analyze how performance trended throughout the month:**\n\n`;
    markdown += `| Date | Spend | Revenue | ROAS | Orders |\n`;
    markdown += `|------|-------|---------|------|--------|\n`;
    data.dailyPerformance.forEach((day: any) => {
      const dateStr = day.date?.value || day.date;
      markdown += `| ${dateStr} | $${day.spend?.toLocaleString() || 0} | $${day.revenue?.toLocaleString() || 0} | ${day.roas?.toFixed(2) || '0.00'}x | ${day.orders || 0} |\n`;
    });

    // Add weekly averages for easier pattern recognition
    if (data.dailyPerformance.length >= 7) {
      markdown += `\n**Weekly Averages:**\n`;
      const weeks = Math.floor(data.dailyPerformance.length / 7);
      for (let i = 0; i < weeks; i++) {
        const weekData = data.dailyPerformance.slice(i * 7, (i + 1) * 7);
        const avgSpend = weekData.reduce((sum: number, d: any) => sum + (d.spend || 0), 0) / weekData.length;
        const avgRevenue = weekData.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0) / weekData.length;
        const avgRoas = weekData.reduce((sum: number, d: any) => sum + (d.roas || 0), 0) / weekData.length;
        const avgOrders = weekData.reduce((sum: number, d: any) => sum + (d.orders || 0), 0) / weekData.length;
        markdown += `- Week ${i + 1}: Avg Spend $${avgSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}, Avg Revenue $${avgRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}, Avg ROAS ${avgRoas.toFixed(2)}x, Avg Orders ${avgOrders.toFixed(0)}\n`;
      }
      markdown += `\n`;
    }
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

  // Add report month information at the top
  if (data.monthlyExecutiveReport?.[0]?.report_month) {
    const reportMonthValue = data.monthlyExecutiveReport[0].report_month;

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
      console.error('[HB Report] Invalid date from report_month:', reportMonthValue);
    }
  }

  // Add platform-level performance with MoM/YoY from monthly_executive_report
  if (data.monthlyExecutiveReport?.[0]) {
    const hero = data.monthlyExecutiveReport[0];

    // Meta Ads Performance with MoM/YoY
    if (hero.meta_spend !== null && hero.meta_spend !== undefined) {
      markdown += `\n## META ADS PERFORMANCE METRICS\n`;
      markdown += `**Use these metrics with MoM/YoY changes for the Meta Ads Performance section:**\n\n`;

      markdown += `**Spend:**\n`;
      markdown += `- meta_spend: $${hero.meta_spend?.toLocaleString() || 'N/A'}\n`;
      markdown += `- meta_spend_mom_pct: ${hero.meta_spend_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_spend_yoy_pct: ${hero.meta_spend_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**Revenue:**\n`;
      markdown += `- meta_revenue: $${hero.meta_revenue?.toLocaleString() || 'N/A'}\n`;
      markdown += `- meta_revenue_mom_pct: ${hero.meta_revenue_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_revenue_yoy_pct: ${hero.meta_revenue_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**ROAS:**\n`;
      markdown += `- meta_roas: ${hero.meta_roas?.toFixed(2) || 'N/A'}x\n`;
      markdown += `- meta_roas_mom_pct: ${hero.meta_roas_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_roas_yoy_pct: ${hero.meta_roas_yoy_pct?.toFixed(1) || 0}%\n\n`;
    }

    // Google Ads Performance with MoM/YoY
    if (hero.google_spend !== null && hero.google_spend !== undefined) {
      markdown += `\n## GOOGLE ADS PERFORMANCE METRICS\n`;
      markdown += `**Use these metrics with MoM/YoY changes for the Google Ads Performance section:**\n\n`;

      markdown += `**Spend:**\n`;
      markdown += `- google_spend: $${hero.google_spend?.toLocaleString() || 'N/A'}\n`;
      markdown += `- google_spend_mom_pct: ${hero.google_spend_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- google_spend_yoy_pct: ${hero.google_spend_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**Revenue:**\n`;
      markdown += `- google_revenue: $${hero.google_revenue?.toLocaleString() || 'N/A'}\n`;
      markdown += `- google_revenue_mom_pct: ${hero.google_revenue_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- google_revenue_yoy_pct: ${hero.google_revenue_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**ROAS:**\n`;
      markdown += `- google_roas: ${hero.google_roas?.toFixed(2) || 'N/A'}x\n`;
      markdown += `- google_roas_mom_pct: ${hero.google_roas_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- google_roas_yoy_pct: ${hero.google_roas_yoy_pct?.toFixed(1) || 0}%\n\n`;
    }
  }

  // Add detailed paid media performance metrics from paid_media_performance table (for granular metrics like CPM, CPC, CTR, Frequency)
  if (data.paidMediaPerformance?.length > 0) {
    const metaData = data.paidMediaPerformance.find((p: any) => p.platform === 'Facebook');
    const googleData = data.paidMediaPerformance.find((p: any) => p.platform === 'Google Ads');

    if (metaData) {
      markdown += `\n## META ADS GRANULAR METRICS (for detailed performance metrics)\n`;
      markdown += `- CPM: $${metaData.calculated_cpm?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CPC: $${metaData.calculated_cpc?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CTR: ${metaData.calculated_ctr?.toFixed(2) || 'N/A'}%\n`;
      markdown += `- Frequency: ${metaData.avg_frequency?.toFixed(2) || 'N/A'}\n`;
      markdown += `- Total Impressions: ${metaData.total_impressions?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Clicks: ${metaData.total_clicks?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Purchases: ${metaData.total_purchases?.toLocaleString() || 'N/A'}\n\n`;
    }

    if (googleData) {
      markdown += `\n## GOOGLE ADS GRANULAR METRICS (for detailed performance metrics)\n`;
      markdown += `- CPM: $${googleData.calculated_cpm?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CPC: $${googleData.calculated_cpc?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CTR: ${googleData.calculated_ctr?.toFixed(2) || 'N/A'}%\n`;
      markdown += `- Conversion Rate: ${googleData.avg_conversion_rate?.toFixed(2) || 'N/A'}%\n`;
      markdown += `- Total Impressions: ${googleData.total_impressions?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Clicks: ${googleData.total_clicks?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Purchases: ${googleData.total_purchases?.toLocaleString() || 'N/A'}\n\n`;
    }
  }

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
  // Start with the H&B report formatting (includes hero metrics, campaigns, products, paid media, funnel ads)
  let markdown = formatHBMonthlyReportAsMarkdown(data);

  // Add JumboMax-specific email performance section
  if (data.emailPerformance?.[0]) {
    const email = data.emailPerformance[0];

    markdown += `\n## EMAIL PERFORMANCE OVERVIEW\n`;
    markdown += `**Overall Email Metrics for the Month:**\n\n`;

    markdown += `**Volume:**\n`;
    markdown += `- Total Sends: ${email.total_sends?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Total Deliveries: ${email.total_deliveries?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Campaigns Sent: ${email.campaigns_sent || 'N/A'}\n`;
    markdown += `- Unique Recipients: ${email.unique_recipients_sent?.toLocaleString() || 'N/A'}\n\n`;

    markdown += `**Engagement:**\n`;
    markdown += `- Open Rate: ${(email.avg_open_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_opens?.toLocaleString() || 'N/A'} opens)\n`;
    markdown += `- Click Rate: ${(email.avg_click_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_clicks?.toLocaleString() || 'N/A'} clicks)\n`;
    markdown += `- Click-to-Open Rate: ${(email.avg_click_to_open_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Unique Open Rate: ${(email.avg_unique_open_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Unique Click Rate: ${(email.avg_unique_click_rate * 100)?.toFixed(2) || 'N/A'}%\n\n`;

    markdown += `**Performance:**\n`;
    markdown += `- Attributed Revenue: $${email.total_attributed_revenue?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Attributed Purchases: ${email.total_attributed_purchases?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Attributed Purchasers: ${email.total_attributed_purchasers?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Purchase Conversion Rate: ${(email.avg_purchase_conversion_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Revenue per Send: $${email.avg_revenue_per_send?.toFixed(2) || 'N/A'}\n\n`;

    markdown += `**Deliverability:**\n`;
    markdown += `- Delivery Rate: ${(email.avg_delivery_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Bounce Rate: ${(email.avg_bounce_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_bounces || 'N/A'} bounces)\n`;
    markdown += `- Unsubscribe Rate: ${(email.avg_unsubscribe_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_unsubscribes || 'N/A'} unsubscribes)\n\n`;
  }

  // Email performance by campaign category
  if (data.emailByCategory?.length > 0) {
    markdown += `\n## EMAIL PERFORMANCE BY CATEGORY\n`;
    markdown += `| Category | Sends | Opens | Clicks | Revenue | Open Rate | Click Rate | CTOR |\n`;
    markdown += `|----------|-------|-------|--------|---------|-----------|------------|---------|\n`;
    data.emailByCategory.forEach((cat: any) => {
      markdown += `| ${cat.campaign_category} | ${cat.sends?.toLocaleString() || 0} | ${cat.opens?.toLocaleString() || 0} | ${cat.clicks?.toLocaleString() || 0} | $${cat.attributed_revenue?.toLocaleString() || 0} | ${(cat.open_rate * 100)?.toFixed(2) || 0}% | ${(cat.click_rate * 100)?.toFixed(2) || 0}% | ${(cat.click_to_open_rate * 100)?.toFixed(2) || 0}% |\n`;
    });
    markdown += `\n`;
  }

  // Email performance by type (campaigns vs flows)
  if (data.emailByType?.length > 0) {
    markdown += `\n## EMAIL PERFORMANCE BY TYPE (Campaigns vs Flows)\n`;
    markdown += `| Type | Sends | Opens | Clicks | Revenue | Open Rate | Click Rate |\n`;
    markdown += `|------|-------|-------|--------|---------|-----------|------------|\n`;
    data.emailByType.forEach((type: any) => {
      markdown += `| ${type.email_type} | ${type.sends?.toLocaleString() || 0} | ${type.opens?.toLocaleString() || 0} | ${type.clicks?.toLocaleString() || 0} | $${type.attributed_revenue?.toLocaleString() || 0} | ${(type.open_rate * 100)?.toFixed(2) || 0}% | ${(type.click_rate * 100)?.toFixed(2) || 0}% |\n`;
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

function formatPuttOutMonthlyReportAsMarkdown(data: any): string {
  // Start with the base monthly report formatting
  let markdown = formatMonthlyReportAsMarkdown(data);

  // Add report month information at the top
  if (data.monthlyExecutiveReport?.[0]?.report_month) {
    const reportMonthValue = data.monthlyExecutiveReport[0].report_month;

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
  }

  // Add Meta Ads performance with MoM/YoY from monthly_executive_report
  if (data.monthlyExecutiveReport?.[0]) {
    const hero = data.monthlyExecutiveReport[0];

    // Meta Ads Performance with MoM/YoY (focus on Meta only, no detailed Google breakout)
    if (hero.meta_spend !== null && hero.meta_spend !== undefined) {
      markdown += `\n## META ADS PERFORMANCE METRICS\n`;
      markdown += `**Use these metrics with MoM/YoY changes for the Meta Ads Performance section:**\n\n`;

      markdown += `**Spend:**\n`;
      markdown += `- meta_spend: $${hero.meta_spend?.toLocaleString() || 'N/A'}\n`;
      markdown += `- meta_spend_mom_pct: ${hero.meta_spend_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_spend_yoy_pct: ${hero.meta_spend_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**Revenue:**\n`;
      markdown += `- meta_revenue: $${hero.meta_revenue?.toLocaleString() || 'N/A'}\n`;
      markdown += `- meta_revenue_mom_pct: ${hero.meta_revenue_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_revenue_yoy_pct: ${hero.meta_revenue_yoy_pct?.toFixed(1) || 0}%\n\n`;

      markdown += `**ROAS:**\n`;
      markdown += `- meta_roas: ${hero.meta_roas?.toFixed(2) || 'N/A'}x\n`;
      markdown += `- meta_roas_mom_pct: ${hero.meta_roas_mom_pct?.toFixed(1) || 0}%\n`;
      markdown += `- meta_roas_yoy_pct: ${hero.meta_roas_yoy_pct?.toFixed(1) || 0}%\n\n`;
    }
  }

  // Add detailed Meta paid media performance metrics (granular metrics like CPM, CPC, CTR, Frequency)
  if (data.paidMediaPerformance?.length > 0) {
    const metaData = data.paidMediaPerformance.find((p: any) => p.platform === 'Facebook');

    if (metaData) {
      markdown += `\n## META ADS GRANULAR METRICS (for detailed performance metrics)\n`;
      markdown += `- CPM: $${metaData.calculated_cpm?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CPC: $${metaData.calculated_cpc?.toFixed(2) || 'N/A'}\n`;
      markdown += `- CTR: ${metaData.calculated_ctr?.toFixed(2) || 'N/A'}%\n`;
      markdown += `- Frequency: ${metaData.avg_frequency?.toFixed(2) || 'N/A'}\n`;
      markdown += `- Total Impressions: ${metaData.total_impressions?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Clicks: ${metaData.total_clicks?.toLocaleString() || 'N/A'}\n`;
      markdown += `- Total Purchases: ${metaData.total_purchases?.toLocaleString() || 'N/A'}\n\n`;
    }
  }

  // Add email performance section (same as JumboMax)
  if (data.emailPerformance?.[0]) {
    const email = data.emailPerformance[0];

    markdown += `\n## EMAIL PERFORMANCE OVERVIEW\n`;
    markdown += `**Overall Email Metrics for the Month:**\n\n`;

    markdown += `**Volume:**\n`;
    markdown += `- Total Sends: ${email.total_sends?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Total Deliveries: ${email.total_deliveries?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Campaigns Sent: ${email.campaigns_sent || 'N/A'}\n`;
    markdown += `- Unique Recipients: ${email.unique_recipients_sent?.toLocaleString() || 'N/A'}\n\n`;

    markdown += `**Engagement:**\n`;
    markdown += `- Open Rate: ${(email.avg_open_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_opens?.toLocaleString() || 'N/A'} opens)\n`;
    markdown += `- Click Rate: ${(email.avg_click_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_clicks?.toLocaleString() || 'N/A'} clicks)\n`;
    markdown += `- Click-to-Open Rate: ${(email.avg_click_to_open_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Unique Open Rate: ${(email.avg_unique_open_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Unique Click Rate: ${(email.avg_unique_click_rate * 100)?.toFixed(2) || 'N/A'}%\n\n`;

    markdown += `**Performance:**\n`;
    markdown += `- Attributed Revenue: $${email.total_attributed_revenue?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Attributed Purchases: ${email.total_attributed_purchases?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Attributed Purchasers: ${email.total_attributed_purchasers?.toLocaleString() || 'N/A'}\n`;
    markdown += `- Purchase Conversion Rate: ${(email.avg_purchase_conversion_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Revenue per Send: $${email.avg_revenue_per_send?.toFixed(2) || 'N/A'}\n\n`;

    markdown += `**Deliverability:**\n`;
    markdown += `- Delivery Rate: ${(email.avg_delivery_rate * 100)?.toFixed(2) || 'N/A'}%\n`;
    markdown += `- Bounce Rate: ${(email.avg_bounce_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_bounces || 'N/A'} bounces)\n`;
    markdown += `- Unsubscribe Rate: ${(email.avg_unsubscribe_rate * 100)?.toFixed(2) || 'N/A'}% (${email.total_unsubscribes || 'N/A'} unsubscribes)\n\n`;
  }

  // Email performance by campaign category
  if (data.emailByCategory?.length > 0) {
    markdown += `\n## EMAIL PERFORMANCE BY CATEGORY\n`;
    markdown += `| Category | Sends | Opens | Clicks | Revenue | Open Rate | Click Rate | CTOR |\n`;
    markdown += `|----------|-------|-------|--------|---------|-----------|------------|---------|\n`;
    data.emailByCategory.forEach((cat: any) => {
      markdown += `| ${cat.campaign_category} | ${cat.sends?.toLocaleString() || 0} | ${cat.opens?.toLocaleString() || 0} | ${cat.clicks?.toLocaleString() || 0} | $${cat.attributed_revenue?.toLocaleString() || 0} | ${(cat.open_rate * 100)?.toFixed(2) || 0}% | ${(cat.click_rate * 100)?.toFixed(2) || 0}% | ${(cat.click_to_open_rate * 100)?.toFixed(2) || 0}% |\n`;
    });
    markdown += `\n`;
  }

  // Email performance by type (campaigns vs flows)
  if (data.emailByType?.length > 0) {
    markdown += `\n## EMAIL PERFORMANCE BY TYPE (Campaigns vs Flows)\n`;
    markdown += `| Type | Sends | Opens | Clicks | Revenue | Open Rate | Click Rate |\n`;
    markdown += `|------|-------|-------|--------|---------|-----------|------------|\n`;
    data.emailByType.forEach((type: any) => {
      markdown += `| ${type.email_type} | ${type.sends?.toLocaleString() || 0} | ${type.opens?.toLocaleString() || 0} | ${type.clicks?.toLocaleString() || 0} | $${type.attributed_revenue?.toLocaleString() || 0} | ${(type.open_rate * 100)?.toFixed(2) || 0}% | ${(type.click_rate * 100)?.toFixed(2) || 0}% |\n`;
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
