import { NextResponse } from 'next/server';
import { getProductIntelligence, getGripRepeatPurchaseAnalysis, getGeographicProductPerformance, getProductAffinity, getProductRankings, getGripSwitchingPatterns, getPutterGripSwitchingPatterns, initializeCurrentClient } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const [products, gripAnalysis, geoPerformance, affinity, rankings, gripSwitching, putterGripSwitching] = await Promise.all([
      getProductIntelligence(period),
      getGripRepeatPurchaseAnalysis(),
      getGeographicProductPerformance(),
      getProductAffinity(),
      getProductRankings(),
      getGripSwitchingPatterns(),
      getPutterGripSwitchingPatterns()
    ]);

    return NextResponse.json({
      products,
      gripAnalysis,
      geoPerformance,
      affinity,
      rankings,
      gripSwitching,
      putterGripSwitching
    });
  } catch (error) {
    console.error('Error in product API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
