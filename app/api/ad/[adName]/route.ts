import { NextRequest, NextResponse } from 'next/server';
import { getAdIntelligentAnalysis, getAdPerformanceTimeseries, initializeCurrentClient } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adName: string }> }
) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const { adName: rawAdName } = await params;
    const adName = decodeURIComponent(rawAdName);
    const searchParams = request.nextUrl.searchParams;
    const adsetName = searchParams.get('adset');
    const days = parseInt(searchParams.get('days') || '30');

    if (!adsetName) {
      return NextResponse.json(
        { error: 'adset parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[AD API] Fetching data for ad: ${adName}, adset: ${adsetName}, days: ${days}`);

    const [analysis, timeseries] = await Promise.all([
      getAdIntelligentAnalysis(adName, adsetName),
      getAdPerformanceTimeseries(adName, adsetName, days)
    ]);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      analysis,
      timeseries
    });
  } catch (error) {
    console.error('[AD API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad performance data' },
      { status: 500 }
    );
  }
}
