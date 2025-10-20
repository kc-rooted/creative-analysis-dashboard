import { NextResponse } from 'next/server';
import {
  getCustomerCLVData,
  getAudienceOverlapAnalysis,
  getCustomerOverviewKPIs,
  getLTVIntelligence,
  getCustomerJourneyAnalysis,
  initializeCurrentClient
} from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const [clvData, audienceOverlap, overviewKPIs, ltvIntelligence, journeyAnalysis] = await Promise.all([
      getCustomerCLVData(),
      getAudienceOverlapAnalysis(),
      getCustomerOverviewKPIs(),
      getLTVIntelligence(),
      getCustomerJourneyAnalysis()
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
