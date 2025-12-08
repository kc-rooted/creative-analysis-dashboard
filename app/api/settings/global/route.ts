import { NextRequest, NextResponse } from 'next/server';
import { runSQLQuery } from '@/lib/bigquery';

export const maxDuration = 60;

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
const TABLE = `${PROJECT_ID}.admin_configs.global_settings`;

// Helper to escape single quotes for BigQuery
const escapeSQL = (str: string) => str.replace(/'/g, "''");

// Helper to escape content for BigQuery triple-quoted strings
const escapeTripleQuote = (str: string) => {
  return str.replace(/\\/g, '\\\\').replace(/'''/g, "\\'\\'\\'");
};

/**
 * GET /api/settings/global
 * Fetch a global setting by key
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'key parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Global Settings API] Fetching setting:', key);

    const query = `
      SELECT setting_key, setting_value, updated_at, updated_by
      FROM \`${TABLE}\`
      WHERE setting_key = '${escapeSQL(key)}'
    `;

    const rows = await runSQLQuery(query);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        setting: null,
      });
    }

    const row = rows[0];
    return NextResponse.json({
      success: true,
      setting: {
        key: row.setting_key,
        value: row.setting_value,
        updated_at: row.updated_at?.value || row.updated_at,
        updated_by: row.updated_by,
      },
    });

  } catch (error) {
    console.error('[Global Settings API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/global
 * Update a global setting
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, updated_by = 'user' } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      );
    }

    console.log('[Global Settings API] Updating setting:', key);

    // Check if setting exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM \`${TABLE}\`
      WHERE setting_key = '${escapeSQL(key)}'
    `;
    const checkResult = await runSQLQuery(checkQuery);
    const exists = checkResult[0]?.count > 0;

    let query: string;
    if (exists) {
      // Update existing
      query = `
        UPDATE \`${TABLE}\`
        SET
          setting_value = '''${escapeTripleQuote(value || '')}''',
          updated_at = CURRENT_TIMESTAMP(),
          updated_by = '${escapeSQL(updated_by)}'
        WHERE setting_key = '${escapeSQL(key)}'
      `;
    } else {
      // Insert new
      query = `
        INSERT INTO \`${TABLE}\` (setting_key, setting_value, updated_at, updated_by)
        VALUES (
          '${escapeSQL(key)}',
          '''${escapeTripleQuote(value || '')}''',
          CURRENT_TIMESTAMP(),
          '${escapeSQL(updated_by)}'
        )
      `;
    }

    await runSQLQuery(query);

    console.log('[Global Settings API] Successfully updated setting:', key);

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
    });

  } catch (error) {
    console.error('[Global Settings API] Error updating:', error);
    return NextResponse.json(
      {
        error: 'Failed to update setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
