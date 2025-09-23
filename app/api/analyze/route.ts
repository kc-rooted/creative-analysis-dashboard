import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { contentIds } = await request.json();
    console.log(`🚀 [ANALYZE] Starting analysis for ${contentIds?.length || 0} creatives:`, contentIds);

    if (!contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: 'Invalid content IDs' },
        { status: 400 }
      );
    }

    if (contentIds.length === 1) {
      // Single creative - use single analysis endpoint
      const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
      console.log(`🎯 [ANALYZE] Single creative mode, calling: ${baseUrl}/api/analyze-single`);
      const response = await fetch(`${baseUrl}/api/analyze-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: contentIds[0] }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [ANALYZE] Single analysis succeeded`);
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
        const errorText = await response.text();
        console.error(`❌ [ANALYZE] Single analysis failed: ${response.status} ${response.statusText}`);
        console.error(`❌ [ANALYZE] Error response:`, errorText);
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
      const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/analyze-batch`, {
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
    console.error(`❌ [ANALYZE] Error triggering analysis:`, error);
    console.error(`❌ [ANALYZE] Error type: ${error.constructor.name}`);
    console.error(`❌ [ANALYZE] Error message: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}