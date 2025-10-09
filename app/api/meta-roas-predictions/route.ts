import { NextResponse } from 'next/server';
import { getMetaRoasPredictions, initializeCurrentClient } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();

    const predictions = await getMetaRoasPredictions();
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Error in meta-roas-predictions API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Meta ROAS predictions' },
      { status: 500 }
    );
  }
}
