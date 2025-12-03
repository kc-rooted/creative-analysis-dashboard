import { NextResponse } from 'next/server';
import { getCampaignIntelligentAnalysis, getCampaignPerformanceTimeseries, getContextualizedCampaignPerformance, getAdDistributionForCampaign, getCampaignAdsList } from '@/lib/bigquery';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignName: string }> }
) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const { campaignName: rawCampaignName } = await params;
    const campaignName = decodeURIComponent(rawCampaignName);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [analysis, timeseries, contextualData, adDistribution, adsList] = await Promise.all([
      getCampaignIntelligentAnalysis(clientId, campaignName),
      getCampaignPerformanceTimeseries(clientId, campaignName, days),
      getContextualizedCampaignPerformance(clientId, campaignName),
      getAdDistributionForCampaign(clientId, campaignName),
      getCampaignAdsList(clientId, campaignName)
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
