import { NextResponse } from 'next/server';
import { getPutterGripPricingModel, getSwingGripPricingModel, initializeCurrentClient } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const [putterGripPricing, swingGripPricing] = await Promise.all([
      getPutterGripPricingModel(),
      getSwingGripPricingModel()
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
