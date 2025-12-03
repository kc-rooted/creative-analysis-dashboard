import { NextRequest, NextResponse } from 'next/server';
import { runSQLQuery } from '@/lib/bigquery';

export const maxDuration = 60;

// Helper to extract date value from BigQuery date object
const extractDate = (dateValue: any) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') return dateValue;
  if (dateValue.value) return dateValue.value;
  return null;
};

// Helper to extract timestamp value from BigQuery timestamp object
const extractTimestamp = (tsValue: any) => {
  if (!tsValue) return null;
  if (typeof tsValue === 'string') return tsValue;
  if (tsValue.value) return tsValue.value;
  return null;
};

/**
 * GET /api/context
 * Fetch all context entries for a client
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Fetching context for client:', clientId);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';

    const query = `
      SELECT
        id,
        client_id,
        category,
        title,
        description,
        event_date,
        start_date,
        end_date,
        magnitude,
        comparison_significant,
        superseded_by,
        source,
        source_document,
        confidence,
        created_at,
        updated_at
      FROM \`${projectId}.business_context.context_entries\`
      WHERE client_id = '${clientId}'
      ORDER BY COALESCE(event_date, start_date) DESC
    `;

    const rows = await runSQLQuery(query);

    console.log('[Context API] Fetched', rows.length, 'items');

    // Transform the data to match the frontend types
    const items = rows.map((row: any) => ({
      id: row.id,
      client_id: row.client_id,
      category: row.category,
      title: row.title,
      description: row.description,
      event_date: extractDate(row.event_date),
      start_date: extractDate(row.start_date),
      end_date: extractDate(row.end_date),
      magnitude: row.magnitude,
      comparison_significant: row.comparison_significant,
      superseded_by: row.superseded_by,
      source: row.source,
      source_document: row.source_document,
      confidence: row.confidence,
      created_at: extractTimestamp(row.created_at),
      updated_at: extractTimestamp(row.updated_at),
    }));

    return NextResponse.json({
      success: true,
      clientId,
      items,
      count: items.length,
    });

  } catch (error) {
    console.error('[Context API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch context data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/context
 * Create a new context entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId, category, title, description,
      event_date, start_date, end_date,
      magnitude, comparison_significant, superseded_by,
      source, source_document, confidence
    } = body;

    // Either event_date OR start_date is required
    if (!clientId || !category || !title || (!event_date && !start_date)) {
      return NextResponse.json(
        { error: 'clientId, category, title, and either event_date or start_date are required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Creating new context entry for client:', clientId);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
    const escapedTitle = title.replace(/'/g, "\\'");
    const escapedDescription = description ? description.replace(/'/g, "\\'") : '';

    const query = `
      INSERT INTO \`${projectId}.business_context.context_entries\`
      (id, client_id, category, title, description, event_date, start_date, end_date, magnitude, comparison_significant, superseded_by, source, source_document, confidence, created_at, updated_at)
      VALUES (
        GENERATE_UUID(),
        '${clientId}',
        '${category}',
        '${escapedTitle}',
        '${escapedDescription}',
        ${event_date ? `DATE('${event_date}')` : 'NULL'},
        ${start_date ? `DATE('${start_date}')` : 'NULL'},
        ${end_date ? `DATE('${end_date}')` : 'NULL'},
        ${magnitude ? `'${magnitude}'` : 'NULL'},
        ${comparison_significant !== undefined && comparison_significant !== null ? comparison_significant : 'NULL'},
        ${superseded_by ? `'${superseded_by}'` : 'NULL'},
        '${source || 'manual'}',
        ${source_document ? `'${source_document}'` : 'NULL'},
        ${confidence !== undefined && confidence !== null ? confidence : 'NULL'},
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP()
      )
    `;

    await runSQLQuery(query);

    console.log('[Context API] Successfully created context entry');

    return NextResponse.json({
      success: true,
      message: 'Context entry created successfully',
    });

  } catch (error) {
    console.error('[Context API] Error creating:', error);
    return NextResponse.json(
      {
        error: 'Failed to create context data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/context
 * Update an existing context entry
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, category, title, description,
      event_date, start_date, end_date,
      magnitude, comparison_significant, superseded_by
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Updating context entry with ID:', id);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
    const escapedTitle = title ? title.replace(/'/g, "\\'") : '';
    const escapedDescription = description ? description.replace(/'/g, "\\'") : '';

    const query = `
      UPDATE \`${projectId}.business_context.context_entries\`
      SET
        category = '${category}',
        title = '${escapedTitle}',
        description = '${escapedDescription}',
        event_date = ${event_date ? `DATE('${event_date}')` : 'NULL'},
        start_date = ${start_date ? `DATE('${start_date}')` : 'NULL'},
        end_date = ${end_date ? `DATE('${end_date}')` : 'NULL'},
        magnitude = ${magnitude ? `'${magnitude}'` : 'NULL'},
        comparison_significant = ${comparison_significant !== undefined && comparison_significant !== null ? comparison_significant : 'NULL'},
        superseded_by = ${superseded_by ? `'${superseded_by}'` : 'NULL'},
        updated_at = CURRENT_TIMESTAMP()
      WHERE id = '${id}'
    `;

    await runSQLQuery(query);

    console.log('[Context API] Successfully updated context entry');

    return NextResponse.json({
      success: true,
      message: 'Context entry updated successfully',
    });

  } catch (error) {
    console.error('[Context API] Error updating:', error);
    return NextResponse.json(
      {
        error: 'Failed to update context data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context
 * Delete a context entry
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Deleting context entry with ID:', id);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
    const query = `DELETE FROM \`${projectId}.business_context.context_entries\` WHERE id = '${id}'`;

    await runSQLQuery(query);

    console.log('[Context API] Successfully deleted context entry');

    return NextResponse.json({
      success: true,
      message: 'Context entry deleted successfully',
    });

  } catch (error) {
    console.error('[Context API] Error deleting:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete context data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
