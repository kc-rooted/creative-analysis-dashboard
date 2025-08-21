import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { contentIds } = await request.json();

    if (!contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: 'Invalid content IDs' },
        { status: 400 }
      );
    }

    if (contentIds.length === 1) {
      // Single creative - use single analysis endpoint
      const response = await fetch(`${request.nextUrl.origin}/api/analyze-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: contentIds[0] }),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          success: true,
          message: `Analysis completed for 1 creative`,
          results: {
            processed: 1,
            successful: 1,
            failed: 0,
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Analysis failed for creative`,
          results: {
            processed: 1,
            successful: 0,
            failed: 1,
          },
        });
      }
    } else {
      // Multiple creatives - trigger batch analysis
      const response = await fetch(`${request.nextUrl.origin}/api/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: Math.min(contentIds.length, 50) }),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      } else {
        throw new Error('Batch analysis failed');
      }
    }

  } catch (error) {
    console.error('Error triggering analysis:', error);
    return NextResponse.json(
      { error: 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}