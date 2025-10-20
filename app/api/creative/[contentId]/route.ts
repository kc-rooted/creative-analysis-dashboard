import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { initializeCurrentClient } from '@/lib/bigquery';
import { getCurrentClientConfigSync } from '@/lib/client-config';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

// Helper to get current dataset name safely
function getCurrentDatasetName(): string {
  try {
    const clientConfig = getCurrentClientConfigSync();
    return clientConfig.bigquery.dataset;
  } catch (error) {
    console.error('Error getting client config, falling back to environment variable:', error);
    return process.env.BIGQUERY_DATASET || 'jumbomax_analytics';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const { contentId: rawContentId } = await params;
    const contentId = decodeURIComponent(rawContentId);

    console.log('Fetching creative details for:', contentId);

    const query = `
      SELECT 
        -- CREATIVE IDENTIFICATION & METADATA
        cpd.content_id,
        cpd.representative_creative_id,
        IFNULL(cpd.representative_creative_name, '') as representative_creative_name,
        IFNULL(cpd.cleaned_creative_name, '') as cleaned_creative_name,
        cpd.representative_ad_text,
        IFNULL(cpd.primary_image_url, '') as primary_image_url,
        cpd.video_id,

        -- PLATFORM & USAGE DATA
        IFNULL(cpd.platforms_used, []) as platforms_used,
        IFNULL(cpd.total_usage_count, 0) as total_usage_count,
        IFNULL(cpd.account_count, 0) as account_count,
        IFNULL(FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.first_seen), 'N/A') as first_seen,
        IFNULL(FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.last_seen), 'N/A') as last_seen,

        -- PERFORMANCE METRICS
        IFNULL(cpd.total_spend, 0) as total_spend,
        IFNULL(cpd.total_impressions, 0) as total_impressions,
        IFNULL(cpd.total_clicks, 0) as total_clicks,
        IFNULL(cpd.total_conversions, 0) as total_conversions,
        IFNULL(cpd.total_revenue, 0) as total_revenue,
        IFNULL(cpd.total_campaigns, 0) as total_campaigns,

        -- CALCULATED KPIs
        IFNULL(cpd.ctr_percent, 0) as ctr_percent,
        IFNULL(cpd.cpm, 0) as cpm,
        IFNULL(cpd.cpc, 0) as cpc,
        IFNULL(cpd.conversion_rate_percent, 0) as conversion_rate_percent,
        IFNULL(cpd.roas, 0) as roas,
        IFNULL(cpd.conversions_per_dollar, 0) as conversions_per_dollar,
        IFNULL(cpd.avg_spend_per_campaign, 0) as avg_spend_per_campaign,

        -- PLATFORM BREAKDOWN
        IFNULL(cpd.facebook_campaigns, 0) as facebook_campaigns,
        IFNULL(cpd.google_ads_campaigns, 0) as google_ads_campaigns,
        IFNULL(cpd.facebook_spend, 0) as facebook_spend,
        IFNULL(cpd.google_ads_spend, 0) as google_ads_spend,
        IFNULL(cpd.facebook_impressions, 0) as facebook_impressions,
        IFNULL(cpd.google_ads_impressions, 0) as google_ads_impressions,

        -- FUNNEL ANALYSIS
        IFNULL(cpd.primary_funnel_stage, 'UNKNOWN') as primary_funnel_stage,
        IFNULL(cpd.tofu_campaigns, 0) as tofu_campaigns,
        IFNULL(cpd.mofu_campaigns, 0) as mofu_campaigns,
        IFNULL(cpd.bofu_campaigns, 0) as bofu_campaigns,
        IFNULL(cpd.tofu_spend, 0) as tofu_spend,
        IFNULL(cpd.mofu_spend, 0) as mofu_spend,
        IFNULL(cpd.bofu_spend, 0) as bofu_spend,

        -- PERFORMANCE ANALYSIS
        cpd.performance_tier,
        FORMAT_DATE('%Y-%m-%d', cpd.first_active_date) as first_active_date,
        FORMAT_DATE('%Y-%m-%d', cpd.last_active_date) as last_active_date,
        IFNULL(cpd.days_since_last_active, 0) as days_since_last_active,

        -- AI ANALYSIS FIELDS (from creative_analysis table)
        IFNULL(ca.analysis_status, 'pending') as analysis_status,
        IFNULL(ca.creative_tags, []) as creative_tags,
        IFNULL(ca.themes, []) as themes,
        IFNULL(ca.color_palette, []) as color_palette,
        ca.color_palette_detailed,
        ca.sentiment,
        ca.target_audience,
        ca.visual_style,
        ca.messaging_tone,
        ca.product_focus,
        ca.call_to_action,
        IFNULL(ca.brand_elements, []) as brand_elements,
        ca.creative_format,
        ca.analysis_text,
        ca.confidence_score

      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
        ON cpd.content_id = ca.content_id
      WHERE cpd.content_id = @contentId
      LIMIT 1
    `;

    const options = {
      query,
      params: { contentId },
    };

    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      console.log('No rows found for content_id:', contentId);
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching creative details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative details' },
      { status: 500 }
    );
  }
}