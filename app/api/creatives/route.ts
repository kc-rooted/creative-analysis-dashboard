import { NextRequest, NextResponse } from 'next/server';
import { getDeduplicatedCreatives } from '@/lib/bigquery';
import { mockCreatives } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = (searchParams.get('sortBy') || 'roas') as 'priority' | 'date' | 'usage' | 'roas' | 'analyzed';


    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock data - USE_MOCK_DATA is set to true');
      
      // Filter mock data based on status
      let filteredData = status 
        ? mockCreatives.filter(c => c.analysis_status === status)
        : mockCreatives;
      
      // Sort mock data
      filteredData = [...filteredData].sort((a, b) => {
        switch (sortBy) {
          case 'priority':
            return b.analysis_priority - a.analysis_priority;
          case 'usage':
            return b.total_usage_count - a.total_usage_count;
          case 'date':
            return new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime();
          default:
            return 0;
        }
      });
      
      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit);
      return NextResponse.json(paginatedData);
    }

    const creatives = await getDeduplicatedCreatives(status, limit, offset, sortBy);
    
    return NextResponse.json(creatives);
  } catch (error) {
    console.error('Error fetching creatives:', error);
    
    // Return empty array with error status
    return NextResponse.json([], { status: 500 });
  }
}