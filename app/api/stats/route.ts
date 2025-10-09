import { NextResponse } from 'next/server';
import { initializeCurrentClient, getAnalysisStatistics } from '@/lib/bigquery';
import { mockStats } from '@/lib/mock-data';

export async function GET() {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock stats - USE_MOCK_DATA is set to true');
      return NextResponse.json(mockStats);
    }

    const stats = await getAnalysisStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    
    // Return empty array with error status
    return NextResponse.json([], { status: 500 });
  }
}