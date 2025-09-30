import { NextResponse } from 'next/server';
import { getPlatformPerformanceData } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const platformData = await getPlatformPerformanceData(period);

    return NextResponse.json(platformData);
  } catch (error) {
    console.error('Error in platform API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
