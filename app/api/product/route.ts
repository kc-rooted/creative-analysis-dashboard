import { NextResponse } from 'next/server';
import { initializeCurrentClient, getProductIntelligence, getGripRepeatPurchaseAnalysis, getGeographicProductPerformance, getProductAffinity, getProductRankings, getGripSwitchingPatterns, getPutterGripSwitchingPatterns } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
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
