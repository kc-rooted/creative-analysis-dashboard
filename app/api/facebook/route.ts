import { NextResponse } from 'next/server';
import { initializeCurrentClient, getFacebookPerformanceData, getFacebookPerformanceByCountry } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || 'mtd';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const comparisonType = searchParams.get('comparisonType') || 'previous-period';

    const [facebookData, countryData] = await Promise.all([
      getFacebookPerformanceData(preset, startDate, endDate, comparisonType),
      getFacebookPerformanceByCountry(preset, startDate, endDate, comparisonType)
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
