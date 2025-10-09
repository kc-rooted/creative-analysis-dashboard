import { NextRequest, NextResponse } from 'next/server';
import { initializeCurrentClient, getAllStarBundlesByGoal } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();

    const searchParams = request.nextUrl.searchParams;
    const goal = searchParams.get('goal') || 'composite';
    const country = searchParams.get('country') || 'United States';

    const bundles = await getAllStarBundlesByGoal(goal, country);

    return NextResponse.json({
      goal,
      country,
      bundles
    });
  } catch (error) {
    console.error('[FUNNEL API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel optimization data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
