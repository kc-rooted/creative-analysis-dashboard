import { NextRequest, NextResponse } from 'next/server';
import { getAllStarBundlesByGoal } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const goal = searchParams.get('goal') || 'composite';
    const country = searchParams.get('country') || 'United States';

    const bundles = await getAllStarBundlesByGoal(clientId, goal, country);

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
