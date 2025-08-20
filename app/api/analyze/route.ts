import { NextRequest, NextResponse } from 'next/server';
import { triggerAnalysis } from '@/lib/bigquery';

export async function POST(request: NextRequest) {
  try {
    const { contentIds } = await request.json();

    if (!contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: 'Invalid content IDs' },
        { status: 400 }
      );
    }

    await triggerAnalysis(contentIds);

    return NextResponse.json({ 
      success: true, 
      message: `Triggered analysis for ${contentIds.length} creatives` 
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    return NextResponse.json(
      { error: 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}