import { NextRequest, NextResponse } from 'next/server';
import { getCampaignUsage } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('imageUrl');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const usage = await getCampaignUsage(imageUrl);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching campaign usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign usage' },
      { status: 500 }
    );
  }
}