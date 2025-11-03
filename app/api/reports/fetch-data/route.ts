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
    default:
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    start: formatDate(startDate),
    end: formatDate(today),
    sql: `DATE >= '${formatDate(startDate)}' AND DATE <= '${formatDate(today)}'`
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
    // 1. Executive Summary - Only essential MTD metrics
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
    monthlyBusinessSummary: `
      SELECT
        monthly_gross_sales,
        monthly_net_sales_after_refunds,
        monthly_orders,
        avg_monthly_aov,
        net_sales_roas,
        avg_monthly_roas,
        monthly_ad_spend,
        monthly_facebook_spend,
        monthly_google_spend
      FROM \`${projectId}.${dataset}.monthly_business_summary\`
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
        revenue_change_pct_30d,
        units_change_pct_30d,
        total_inventory_quantity,
        avg_variant_price
      FROM \`${projectId}.${dataset}.product_intelligence\`
      ORDER BY revenue_30d DESC
      LIMIT 10
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
  // Add other report types as needed
  return JSON.stringify(data, null, 2);
}

function formatMonthlyReportAsMarkdown(data: any): string {
  let markdown = '# PRE-FETCHED DATA\n\n';

  // Executive Summary
  if (data.executiveSummary?.[0]) {
    const exec = data.executiveSummary[0];
    markdown += `## Executive Summary (MTD)\n`;
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
    markdown += `- Net Sales ROAS: ${monthly.net_sales_roas?.toFixed(2) || 'N/A'}x | Attributed ROAS: ${monthly.avg_monthly_roas?.toFixed(2) || 'N/A'}x\n`;
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

  // Products
  if (data.productIntelligence?.length > 0) {
    markdown += `\n## Top 10 Products by Revenue\n`;
    markdown += `| Product | Revenue (30d) | Units Sold | Revenue Change | Inventory |\n`;
    markdown += `|---------|---------------|------------|----------------|----------|\n`;
    data.productIntelligence.forEach((p: any) => {
      markdown += `| ${p.product_title} | $${p.revenue_30d?.toLocaleString() || 0} | ${p.units_sold_30d || 0} | ${p.revenue_change_pct_30d || 0 > 0 ? '+' : ''}${p.revenue_change_pct_30d?.toFixed(1) || 0}% | ${p.total_inventory_quantity || 0} |\n`;
    });
  }

  return markdown;
}

function formatHBMonthlyReportAsMarkdown(data: any): string {
  // Start with the standard monthly report formatting
  let markdown = formatMonthlyReportAsMarkdown(data);

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
