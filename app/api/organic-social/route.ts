import { NextResponse } from 'next/server';
import { getOrganicSocialData } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'all'; // 'all', 'instagram', 'facebook', 'tiktok', 'youtube'
    const period = searchParams.get('period') || '30d'; // '7d', '30d', '90d'
    const comparison = searchParams.get('comparison') || 'previous-period'; // 'previous-period', 'previous-year'

    // Fetch organic social data with comparison
    const data = await getOrganicSocialData(clientId, platform, period, comparison);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in organic-social API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organic social data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
