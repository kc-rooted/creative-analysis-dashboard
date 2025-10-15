import { NextResponse } from 'next/server';
import { getMetaRoasPredictions } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
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
