import { NextResponse } from 'next/server';
import { getProductIntelligence, getGripRepeatPurchaseAnalysis, getGeographicProductPerformance, getProductAffinity, getProductRankings, getGripSwitchingPatterns } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const [products, gripAnalysis, geoPerformance, affinity, rankings, gripSwitching] = await Promise.all([
      getProductIntelligence(period),
      getGripRepeatPurchaseAnalysis(),
      getGeographicProductPerformance(),
      getProductAffinity(),
      getProductRankings(),
      getGripSwitchingPatterns()
    ]);

    return NextResponse.json({
      products,
      gripAnalysis,
      geoPerformance,
      affinity,
      rankings,
      gripSwitching
    });
  } catch (error) {
    console.error('Error in product API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
