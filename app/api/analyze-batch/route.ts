import { NextRequest, NextResponse } from 'next/server';
import { processCreativesForAnalysis } from '@/lib/claude-analysis';
import { getClientConfig, CLIENT_CONFIGS } from '@/lib/client-config';

export async function POST(request: NextRequest) {
  try {
    // Get client ID from header - REQUIRED for request isolation
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'x-client-id header is required' },
        { status: 400 }
      );
    }

    // Validate client exists
    if (!CLIENT_CONFIGS[clientId]) {
      return NextResponse.json(
        { error: `Invalid client ID: ${clientId}` },
        { status: 400 }
      );
    }

    const clientConfig = getClientConfig(clientId);
    const datasetName = clientConfig.bigquery.dataset;
    console.log(`🔧 [ANALYZE-BATCH] Using client: ${clientId}, dataset: ${datasetName}`);

    const { limit = 10 } = await request.json();

    if (limit > 50) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 50 creatives per batch' },
        { status: 400 }
      );
    }

    console.log(`Starting batch analysis of up to ${limit} creatives for ${clientId}`);

    // Pass clientId to batch processing function
    const results = await processCreativesForAnalysis(limit, clientId);

    return NextResponse.json({
      success: true,
      message: `Batch analysis completed`,
      results: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
      },
    });

  } catch (error) {
    console.error('Error in batch analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Batch analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Get current analysis queue status
  try {
    // Get client ID from header - REQUIRED for request isolation
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'x-client-id header is required' },
        { status: 400 }
      );
    }

    // Validate client exists
    if (!CLIENT_CONFIGS[clientId]) {
      return NextResponse.json(
        { error: `Invalid client ID: ${clientId}` },
        { status: 400 }
      );
    }

    const clientConfig = getClientConfig(clientId);
    const datasetName = clientConfig.bigquery.dataset;

    const { BigQuery } = require('@google-cloud/bigquery');

    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
        : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
      ),
    });

    const query = `
      SELECT
        IFNULL(ca.analysis_status, 'pending') as analysis_status,
        COUNT(*) as count,
        SUM(d.total_usage_count) as total_campaign_impact
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.deduplicated_creative_analysis\` d
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\` ca
        ON d.content_id = ca.content_id
      WHERE d.primary_image_url IS NOT NULL AND d.primary_image_url != ''
      GROUP BY IFNULL(ca.analysis_status, 'pending')
    `;

    const [rows] = await bigquery.query(query);

    const stats = rows.reduce((acc: any, row: any) => {
      acc[row.analysis_status] = {
        count: row.count,
        campaign_impact: row.total_campaign_impact,
      };
      return acc;
    }, {});

    return NextResponse.json({
      queue_status: stats,
      pending_count: stats.pending?.count || 0,
      analyzing_count: stats.analyzing?.count || 0,
      completed_count: stats.completed?.count || 0,
      failed_count: stats.failed?.count || 0,
    });

  } catch (error) {
    console.error('Error getting queue status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get queue status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}