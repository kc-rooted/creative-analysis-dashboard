import { NextRequest, NextResponse } from 'next/server';
import { analyzeCreativeWithClaude, updateCreativeAnalysis } from '@/lib/claude-analysis';
import { BigQuery } from '@google-cloud/bigquery';
import { getCurrentClientConfigSync } from '@/lib/client-config';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json();

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    const creative = rows[0];

    if (!creative.primary_image_url) {
      return NextResponse.json(
        { error: 'No image URL available for this creative' },
        { status: 400 }
      );
    }

    // Mark as analyzing
    await bigquery.query({
      query: `
        UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\`
        SET analysis_status = 'analyzing', updated_at = CURRENT_TIMESTAMP()
        WHERE content_id = @content_id
      `,
      params: { content_id: contentId },
    });

    // Analyze with Claude
    console.log(`Starting analysis for: ${contentId}`);
    const analysisResult = await analyzeCreativeWithClaude(
      creative.primary_image_url,
      creative
    );

    // Update database
    await updateCreativeAnalysis(contentId, analysisResult);

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      analysis: analysisResult,
    });

  } catch (error) {
    console.error('Error in single creative analysis:', error);
    
    // Try to update status to failed if we have a contentId
    const body = await request.json().catch(() => ({}));
    if (body.contentId) {
      try {
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
            content_id: body.contentId,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return NextResponse.json(
      { 
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}