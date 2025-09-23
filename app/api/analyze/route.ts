import { NextRequest, NextResponse } from 'next/server';
import { analyzeCreativeWithClaude, updateCreativeAnalysis } from '@/lib/claude-analysis';
import { BigQuery } from '@google-cloud/bigquery';
import { getCurrentClientConfigSync } from '@/lib/client-config';

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
      // Single creative - call analysis functions directly
      const contentId = contentIds[0];
      console.log(`🎯 [ANALYZE] Single creative mode, analyzing: ${contentId}`);

      const bigquery = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
          : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
        ),
      });

      // Helper to get current dataset name safely
      function getCurrentDatasetName(): string {
        try {
          const clientConfig = getCurrentClientConfigSync();
          return clientConfig.bigquery.dataset;
        } catch (error) {
          console.error('Error getting client config, falling back to environment variable:', error);
          return process.env.BIGQUERY_DATASET || 'jumbomax_analytics';
        }
      }

      try {
        // Get creative details
        const query = `
          SELECT
            cpd.content_id,
            cpd.primary_image_url,
            cpd.cleaned_creative_name,
            cpd.representative_creative_name,
            cpd.representative_ad_text,
            cpd.total_usage_count,
            ca.analysis_status,
            ca.retry_count
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
          LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
            ON cpd.content_id = ca.content_id
          WHERE cpd.content_id = @content_id
            AND cpd.creative_type != 'NO_VISUAL'
          LIMIT 1
        `;

        const [rows] = await bigquery.query({
          query,
          params: { content_id: contentId },
        });

        if (rows.length === 0) {
          console.error(`❌ [ANALYZE] Creative not found: ${contentId}`);
          return NextResponse.json({
            success: false,
            message: `Creative not found`,
            results: { processed: 1, successful: 0, failed: 1 },
          });
        }

        const creative = rows[0];

        if (!creative.primary_image_url) {
          console.error(`❌ [ANALYZE] No image URL for creative: ${contentId}`);
          return NextResponse.json({
            success: false,
            message: `No image URL available for this creative`,
            results: { processed: 1, successful: 0, failed: 1 },
          });
        }

        // Mark as analyzing
        console.log(`🔄 [${contentId}] Marking as analyzing...`);
        await bigquery.query({
          query: `
            UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\`
            SET analysis_status = 'analyzing', updated_at = CURRENT_TIMESTAMP()
            WHERE content_id = @content_id
          `,
          params: { content_id: contentId },
        });
        console.log(`✅ [${contentId}] Status updated to analyzing`);

        // Analyze with Claude
        console.log(`🎯 [${contentId}] Starting Claude analysis...`);
        console.log(`📷 [${contentId}] Image URL: ${creative.primary_image_url}`);
        const analysisResult = await analyzeCreativeWithClaude(
          creative.primary_image_url,
          creative
        );
        console.log(`🧠 [${contentId}] Claude analysis completed successfully`);

        // Update database
        console.log(`💾 [${contentId}] Updating database with analysis results...`);
        await updateCreativeAnalysis(contentId, analysisResult);
        console.log(`✅ [${contentId}] Database update completed`);

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

      } catch (error) {
        console.error(`❌ [${contentId}] Error in single creative analysis:`, error);
        console.error(`❌ [${contentId}] Error stack:`, error.stack);

        // Try to update status to failed
        try {
          console.log(`🔄 [${contentId}] Updating status to failed due to error...`);
          await bigquery.query({
            query: `
              UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\`
              SET
                analysis_status = 'failed',
                error_message = @error_message,
                retry_count = COALESCE(retry_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP()
              WHERE content_id = @content_id
            `,
            params: {
              content_id: contentId,
              error_message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          console.log(`✅ [${contentId}] Status updated to failed`);
        } catch (updateError) {
          console.error(`❌ [${contentId}] Failed to update error status:`, updateError);
        }

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