import { NextRequest, NextResponse } from 'next/server';
import { getCampaignUsage } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('imageUrl');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const usage = await getCampaignUsage(clientId, imageUrl);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching campaign usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign usage' },
      { status: 500 }
    );
  }
}