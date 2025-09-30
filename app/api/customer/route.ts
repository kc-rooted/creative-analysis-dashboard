import { NextResponse } from 'next/server';
import { getCustomerCLVData } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const clvData = await getCustomerCLVData();

    return NextResponse.json({
      clvData
    });
  } catch (error) {
    console.error('Error in customer API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
