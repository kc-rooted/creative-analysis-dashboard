import { NextRequest, NextResponse } from 'next/server';
import { runSQLQuery } from '@/lib/bigquery';

export const maxDuration = 60;

/**
 * GET /api/context
 * Fetch all strategic context and business events for a client
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

    // Query base tables directly with UNION (context_summary view may be outdated)
    const query = `
      SELECT
        'strategic' as context_type,
        context_id as id,
        client_id,
        context_category as category,
        context_title as title,
        context_description as description,
        start_date,
        end_date,
        created_at
      FROM \`${projectId}.business_context.strategic_context\`
      WHERE client_id = '${clientId}'

      UNION ALL

      SELECT
        'event' as context_type,
        event_id as id,
        client_id,
        event_category as category,
        event_title as title,
        event_description as description,
        event_date as start_date,
        impact_end_date as end_date,
        created_at
      FROM \`${projectId}.business_context.business_events\`
      WHERE client_id = '${clientId}'

      ORDER BY start_date DESC
    `;

    const rows = await runSQLQuery(query);

    console.log('[Context API] Fetched', rows.length, 'items');

    // Helper to extract date value from BigQuery date object
    const extractDate = (dateValue: any) => {
      if (!dateValue) return null;
      if (typeof dateValue === 'string') return dateValue;
      if (dateValue.value) return dateValue.value;
      return null;
    };

    // Transform the data to match the frontend types
    const items = rows.map((row: any) => {
      if (row.context_type === 'strategic') {
        return {
          type: 'strategic',
          context_id: row.id,
          client_id: row.client_id,
          context_category: row.category,
          start_date: extractDate(row.start_date),
          end_date: extractDate(row.end_date),
          context_title: row.title,
          context_description: row.description,
          created_by: 'system',
          created_at: row.created_at,
          updated_at: row.created_at,
        };
      } else {
        return {
          type: 'event',
          event_id: row.id,
          client_id: row.client_id,
          event_category: row.category,
          event_date: extractDate(row.start_date),
          impact_end_date: extractDate(row.end_date),
          event_title: row.title,
          event_description: row.description,
          created_by: 'system',
          created_at: row.created_at,
          updated_at: row.created_at,
        };
      }
    });

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
 * Create a new strategic context or business event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, clientId, ...data } = body;

    if (!type || !clientId) {
      return NextResponse.json(
        { error: 'Type and clientId are required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Creating new', type, 'for client:', clientId);

    let query = '';

    if (type === 'strategic') {
      query = `
        INSERT INTO \`business_context.strategic_context\` VALUES (
          GENERATE_UUID(),
          '${clientId}',
          '${data.context_category}',
          DATE('${data.start_date}'),
          ${data.end_date ? `DATE('${data.end_date}')` : 'NULL'},
          '${data.context_title.replace(/'/g, "\\'")}',
          '${data.context_description.replace(/'/g, "\\'")}',
          '${data.created_by || 'system'}',
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
      `;
    } else if (type === 'event') {
      query = `
        INSERT INTO \`business_context.business_events\` VALUES (
          GENERATE_UUID(),
          '${clientId}',
          '${data.event_category}',
          DATE('${data.event_date}'),
          ${data.impact_end_date ? `DATE('${data.impact_end_date}')` : 'NULL'},
          '${data.event_title.replace(/'/g, "\\'")}',
          '${data.event_description.replace(/'/g, "\\'")}',
          '${data.created_by || 'system'}',
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
      `;
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "strategic" or "event"' },
        { status: 400 }
      );
    }

    await runSQLQuery(query);

    console.log('[Context API] Successfully created', type);

    return NextResponse.json({
      success: true,
      message: `${type} created successfully`,
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
 * Update an existing strategic context or business event
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Updating', type, 'with ID:', id);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
    let query = '';

    if (type === 'strategic') {
      query = `
        UPDATE \`${projectId}.business_context.strategic_context\`
        SET
          context_category = '${data.context_category}',
          start_date = DATE('${data.start_date}'),
          end_date = ${data.end_date ? `DATE('${data.end_date}')` : 'NULL'},
          context_title = '${data.context_title.replace(/'/g, "\\'")}',
          context_description = '${data.context_description.replace(/'/g, "\\'")}',
          updated_at = CURRENT_TIMESTAMP()
        WHERE context_id = '${id}'
      `;
    } else if (type === 'event') {
      query = `
        UPDATE \`${projectId}.business_context.business_events\`
        SET
          event_category = '${data.event_category}',
          event_date = DATE('${data.event_date}'),
          impact_end_date = ${data.impact_end_date ? `DATE('${data.impact_end_date}')` : 'NULL'},
          event_title = '${data.event_title.replace(/'/g, "\\'")}',
          event_description = '${data.event_description.replace(/'/g, "\\'")}',
          updated_at = CURRENT_TIMESTAMP()
        WHERE event_id = '${id}'
      `;
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "strategic" or "event"' },
        { status: 400 }
      );
    }

    await runSQLQuery(query);

    console.log('[Context API] Successfully updated', type);

    return NextResponse.json({
      success: true,
      message: `${type} updated successfully`,
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
 * Delete a strategic context or business event
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    console.log('[Context API] Deleting', type, 'with ID:', id);

    let query = '';

    if (type === 'strategic') {
      query = `DELETE FROM \`business_context.strategic_context\` WHERE context_id = '${id}'`;
    } else if (type === 'event') {
      query = `DELETE FROM \`business_context.business_events\` WHERE event_id = '${id}'`;
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "strategic" or "event"' },
        { status: 400 }
      );
    }

    await runSQLQuery(query);

    console.log('[Context API] Successfully deleted', type);

    return NextResponse.json({
      success: true,
      message: `${type} deleted successfully`,
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
