import { NextResponse } from 'next/server';
import { getAnalysisStatistics } from '@/lib/bigquery';
import { mockStats } from '@/lib/mock-data';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock stats - USE_MOCK_DATA is set to true');
      return NextResponse.json(mockStats);
    }

    const stats = await getAnalysisStatistics(clientId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    
    // Return empty array with error status
    return NextResponse.json([], { status: 500 });
  }
}