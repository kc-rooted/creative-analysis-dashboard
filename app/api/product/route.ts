import { NextResponse } from 'next/server';
import { getProductIntelligence, getGripRepeatPurchaseAnalysis, getGeographicProductPerformance, getProductAffinity, getProductRankings, getGripSwitchingPatterns, getPutterGripSwitchingPatterns } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Only JumboMax has grip/putter analysis
    const isJumboMax = clientId === 'jumbomax';

    // Fetch base data that all clients need
    const basePromises = [
      getProductIntelligence(clientId, period),
      getGeographicProductPerformance(clientId),
      getProductAffinity(clientId),
      getProductRankings(clientId)
    ];

    // Add grip/putter analyses only for JumboMax
    if (isJumboMax) {
      const [products, geoPerformance, affinity, rankings, gripAnalysis, gripSwitching, putterGripSwitching] = await Promise.all([
        ...basePromises,
        getGripRepeatPurchaseAnalysis(clientId),
        getGripSwitchingPatterns(clientId),
        getPutterGripSwitchingPatterns(clientId)
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
    } else {
      // Non-JumboMax clients: skip grip/putter analysis
      const [products, geoPerformance, affinity, rankings] = await Promise.all(basePromises);

      return NextResponse.json({
        products,
        gripAnalysis: null,
        geoPerformance,
        affinity,
        rankings,
        gripSwitching: null,
        putterGripSwitching: null
      });
    }
  } catch (error) {
    console.error('Error in product API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
