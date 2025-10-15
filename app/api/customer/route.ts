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
