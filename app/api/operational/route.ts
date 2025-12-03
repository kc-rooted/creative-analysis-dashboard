import { NextResponse } from 'next/server';
import { getPutterGripPricingModel, getSwingGripPricingModel } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const [putterGripPricing, swingGripPricing] = await Promise.all([
      getPutterGripPricingModel(clientId),
      getSwingGripPricingModel(clientId)
    ]);

    return NextResponse.json({
      putterGripPricing,
      swingGripPricing
    });
  } catch (error) {
    console.error('Error in operational API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operational data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
