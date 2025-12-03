import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

const ADMIN_DATASET = 'admin_configs';
const CURRENT_CLIENT_TABLE = 'current_client_setting';

/**
 * GET - Get default client (for first-time users only)
 *
 * IMPORTANT: This endpoint is ONLY used as a fallback for first-time users
 * who don't have a client stored in their browser's localStorage.
 *
 * After a client is selected, it's stored in localStorage per-browser for
 * proper multi-user isolation. The client-provider.tsx component handles
 * this logic - it checks localStorage first, and only falls back to this
 * endpoint if no client is stored.
 */
export async function GET() {
  try {
    const query = `
      SELECT client_id
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CURRENT_CLIENT_TABLE}\`
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const [rows] = await bigquery.query(query);

    if (rows.length > 0) {
      return NextResponse.json({ clientId: rows[0].client_id });
    } else {
      // No client selected - return 404
      return NextResponse.json(
        { error: 'No client selected. Please select a client from the admin panel.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching current client:', error);
    // Table doesn't exist or other error - return 404
    return NextResponse.json(
      { error: 'No client selected. Please select a client from the admin panel.' },
      { status: 404 }
    );
  }
}

/**
 * POST - DEPRECATED
 *
 * This endpoint has been deprecated because writing to a shared database table
 * causes cross-browser/cross-user contamination. Client selection is now handled
 * entirely via localStorage in the browser (see client-provider.tsx).
 *
 * If you're seeing this endpoint being called, it means old code is still using
 * the deprecated approach and needs to be updated.
 */
export async function POST() {
  console.warn('[DEPRECATED] POST /api/admin/current-client called - this endpoint is deprecated. Client selection should be handled via localStorage in client-provider.tsx');
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Client selection is now handled via localStorage for multi-user isolation.' },
    { status: 410 } // 410 Gone
  );
}