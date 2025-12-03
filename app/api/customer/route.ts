import { NextResponse } from 'next/server';
import {
  getCustomerCLVData,
  getAudienceOverlapAnalysis,
  getCustomerOverviewKPIs,
  getLTVIntelligence,
  getCustomerJourneyAnalysis
} from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const [clvData, audienceOverlap, overviewKPIs, ltvIntelligence, journeyAnalysis] = await Promise.all([
      getCustomerCLVData(clientId),
      getAudienceOverlapAnalysis(clientId),
      getCustomerOverviewKPIs(clientId),
      getLTVIntelligence(clientId),
      getCustomerJourneyAnalysis(clientId)
    ]);

    return NextResponse.json({
      clvData,
      audienceOverlap,
      overviewKPIs,
      ltvIntelligence,
      journeyAnalysis
    });
  } catch (error) {
    console.error('Error in customer API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
