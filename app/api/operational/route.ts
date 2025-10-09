import { NextResponse } from 'next/server';
import { initializeCurrentClient, getPutterGripPricingModel, getSwingGripPricingModel } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
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
