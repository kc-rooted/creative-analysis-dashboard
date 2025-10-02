import { NextResponse } from 'next/server';
import { getCustomerCLVData, getAudienceOverlapAnalysis } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const [clvData, audienceOverlap] = await Promise.all([
      getCustomerCLVData(),
      getAudienceOverlapAnalysis()
    ]);

    return NextResponse.json({
      clvData,
      audienceOverlap
    });
  } catch (error) {
    console.error('Error in customer API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
