import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { getClientConfig, CLIENT_CONFIGS } from '@/lib/client-config';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

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

    const { timeoutMinutes = 10 } = await request.json();

    // Reset creatives stuck in 'analyzing' status for more than specified time
    const query = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\`
      SET
        analysis_status = 'pending',
        error_message = 'Reset due to timeout',
        updated_at = CURRENT_TIMESTAMP()
      WHERE analysis_status = 'analyzing'
        AND updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @timeout_minutes MINUTE)
    `;

    const [result] = await bigquery.query({
      query,
      params: { timeout_minutes: timeoutMinutes },
    });

    const numUpdated = result.numDmlAffectedRows || 0;

    return NextResponse.json({
      success: true,
      message: `Reset ${numUpdated} stuck analyses older than ${timeoutMinutes} minutes`,
      numUpdated,
    });

  } catch (error) {
    console.error('Error resetting stuck analyses:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset stuck analyses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Get count of stuck analyses
    const query = `
      SELECT
        analysis_status,
        COUNT(*) as count,
        MIN(updated_at) as oldest_update
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.creative_analysis\`
      WHERE analysis_status = 'analyzing'
        AND updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
      GROUP BY analysis_status
    `;

    const [rows] = await bigquery.query(query);

    return NextResponse.json({
      stuck_analyses: rows,
      message: rows.length > 0
        ? `Found ${rows[0].count} analyses stuck for more than 5 minutes`
        : 'No stuck analyses found'
    });

  } catch (error) {
    console.error('Error checking stuck analyses:', error);
    return NextResponse.json(
      {
        error: 'Failed to check stuck analyses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}