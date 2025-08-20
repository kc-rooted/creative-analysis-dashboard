import { NextResponse } from 'next/server';
import { getAnalysisStatistics } from '@/lib/bigquery';
import { mockStats } from '@/lib/mock-data';

export async function GET() {
  try {
    // Check if BigQuery credentials are available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock stats - BigQuery credentials not configured');
      return NextResponse.json(mockStats);
    }

    const stats = await getAnalysisStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    
    // Return mock stats as fallback
    console.log('Falling back to mock stats due to error');
    return NextResponse.json(mockStats);
  }
}