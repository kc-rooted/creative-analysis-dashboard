import { NextResponse } from 'next/server';
import { getCampaignIntelligentAnalysis, getCampaignPerformanceTimeseries, getContextualizedCampaignPerformance } from '@/lib/bigquery';

export async function GET(
  request: Request,
  { params }: { params: { campaignName: string } }
) {
  try {
    const campaignName = decodeURIComponent(params.campaignName);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [analysis, timeseries, contextualData] = await Promise.all([
      getCampaignIntelligentAnalysis(campaignName),
      getCampaignPerformanceTimeseries(campaignName, days),
      getContextualizedCampaignPerformance(campaignName)
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
      contextualData
    });
  } catch (error) {
    console.error('Error in Campaign API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
