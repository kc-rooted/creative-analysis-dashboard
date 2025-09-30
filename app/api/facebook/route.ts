import { NextResponse } from 'next/server';
import { getFacebookPerformanceData } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || 'mtd';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const comparisonType = searchParams.get('comparisonType') || 'previous-period';

    const facebookData = await getFacebookPerformanceData(preset, startDate, endDate, comparisonType);

    return NextResponse.json(facebookData);
  } catch (error) {
    console.error('Error in Facebook API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
