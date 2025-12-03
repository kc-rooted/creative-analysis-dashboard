import { NextResponse } from 'next/server';
import { getFacebookPerformanceData, getFacebookPerformanceByCountry } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || 'mtd';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const comparisonType = searchParams.get('comparisonType') || 'previous-period';

    const [facebookData, countryData] = await Promise.all([
      getFacebookPerformanceData(clientId, preset, startDate, endDate, comparisonType),
      getFacebookPerformanceByCountry(clientId, preset, startDate, endDate, comparisonType)
    ]);

    return NextResponse.json({
      ...facebookData,
      countryPerformance: countryData
    });
  } catch (error) {
    console.error('Error in Facebook API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
