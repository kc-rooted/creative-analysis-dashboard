import { NextResponse } from 'next/server';
import { initializeCurrentClient, getCampaignIntelligentAnalysis, getCampaignPerformanceTimeseries, getContextualizedCampaignPerformance, getAdDistributionForCampaign, getCampaignAdsList } from '@/lib/bigquery';

export async function GET(
  request: Request,
  { params }: { params: { campaignName: string } }
) {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
    const campaignName = decodeURIComponent(params.campaignName);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [analysis, timeseries, contextualData, adDistribution, adsList] = await Promise.all([
      getCampaignIntelligentAnalysis(campaignName),
      getCampaignPerformanceTimeseries(campaignName, days),
      getContextualizedCampaignPerformance(campaignName),
      getAdDistributionForCampaign(campaignName),
      getCampaignAdsList(campaignName)
    ]);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      analysis,
      timeseries,
      contextualData,
      adDistribution,
      adsList
    });
  } catch (error) {
    console.error('Error in Campaign API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
