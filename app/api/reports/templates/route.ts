import { NextRequest, NextResponse } from 'next/server';
import { runSQLQuery } from '@/lib/bigquery';

export const maxDuration = 60;

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelligence-451803';
const TABLE = `${PROJECT_ID}.admin_configs.report_templates`;

// Helper to escape single quotes for BigQuery standard strings
const escapeSQL = (str: string) => str.replace(/'/g, "''");

// Helper to escape content for BigQuery triple-quoted strings
// Triple-quoted strings in BigQuery don't need quote escaping, but we must
// escape any triple-quote sequences within the content to prevent premature termination
const escapeTripleQuote = (str: string) => {
  // Replace any occurrence of ''' with \'\'\' to escape it within triple-quoted strings
  // Also escape backslashes that precede quotes to prevent escape sequence issues
  return str.replace(/\\/g, '\\\\').replace(/'''/g, "\\'\\'\\'");
};

/**
 * GET /api/reports/templates
 * Fetch all report templates, optionally filtered by client_id
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id');
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    console.log('[Templates API] Fetching templates for client:', clientId);

    let whereClause = 'WHERE 1=1';

    if (clientId) {
      // Get templates for specific client OR templates available to all clients
      whereClause += ` AND (client_id = '${escapeSQL(clientId)}' OR client_id = 'all')`;
    }

    if (!includeInactive) {
      whereClause += ' AND is_active = TRUE';
    }

    const query = `
      SELECT
        id,
        client_id,
        template_id,
        title,
        description,
        category,
        prompt,
        period,
        data_fetcher,
        is_active,
        created_at,
        updated_at,
        created_by,
        modified_by
      FROM \`${TABLE}\`
      ${whereClause}
      ORDER BY client_id, title
    `;

    const rows = await runSQLQuery(query);

    console.log('[Templates API] Fetched', rows.length, 'templates');

    // Transform the data
    const templates = rows.map((row: any) => ({
      id: row.id,
      client_id: row.client_id,
      template_id: row.template_id,
      title: row.title,
      description: row.description,
      category: row.category,
      prompt: row.prompt,
      period: row.period || '30d', // Default to 30d if not specified
      data_fetcher: row.data_fetcher || row.template_id, // Default to template_id if not specified
      is_active: row.is_active,
      created_at: row.created_at?.value || row.created_at,
      updated_at: row.updated_at?.value || row.updated_at,
      created_by: row.created_by,
      modified_by: row.modified_by,
    }));

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });

  } catch (error) {
    console.error('[Templates API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/templates
 * Create a new report template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_id,
      template_id,
      title,
      description,
      category,
      prompt,
      created_by,
    } = body;

    if (!client_id || !template_id || !title || !prompt) {
      return NextResponse.json(
        { error: 'client_id, template_id, title, and prompt are required' },
        { status: 400 }
      );
    }

    console.log('[Templates API] Creating template:', template_id, 'for client:', client_id);

    const query = `
      INSERT INTO \`${TABLE}\`
      (id, client_id, template_id, title, description, category, prompt, is_active, created_at, updated_at, created_by, modified_by)
      VALUES (
        GENERATE_UUID(),
        '${escapeSQL(client_id)}',
        '${escapeSQL(template_id)}',
        '${escapeSQL(title)}',
        '${escapeSQL(description || '')}',
        '${escapeSQL(category || 'performance')}',
        '''${escapeTripleQuote(prompt)}''',
        TRUE,
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP(),
        '${escapeSQL(created_by || 'unknown')}',
        '${escapeSQL(created_by || 'unknown')}'
      )
    `;

    await runSQLQuery(query);

    console.log('[Templates API] Successfully created template');

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
    });

  } catch (error) {
    console.error('[Templates API] Error creating:', error);
    return NextResponse.json(
      {
        error: 'Failed to create template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reports/templates
 * Update an existing report template
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      template_id,
      title,
      description,
      category,
      prompt,
      is_active,
      modified_by,
    } = body;

    // Allow update by either id or template_id
    if (!id && !template_id) {
      return NextResponse.json(
        { error: 'Either id or template_id is required' },
        { status: 400 }
      );
    }

    console.log('[Templates API] Updating template:', id || template_id);

    // Build SET clause dynamically based on provided fields
    const updates: string[] = [];

    if (title !== undefined) updates.push(`title = '${escapeSQL(title)}'`);
    if (description !== undefined) updates.push(`description = '${escapeSQL(description)}'`);
    if (category !== undefined) updates.push(`category = '${escapeSQL(category)}'`);
    if (prompt !== undefined) updates.push(`prompt = '''${escapeTripleQuote(prompt)}'''`);
    if (is_active !== undefined) updates.push(`is_active = ${is_active}`);
    if (modified_by) updates.push(`modified_by = '${escapeSQL(modified_by)}'`);

    updates.push('updated_at = CURRENT_TIMESTAMP()');

    const whereClause = id
      ? `id = '${escapeSQL(id)}'`
      : `template_id = '${escapeSQL(template_id)}'`;

    const query = `
      UPDATE \`${TABLE}\`
      SET ${updates.join(', ')}
      WHERE ${whereClause}
    `;

    await runSQLQuery(query);

    console.log('[Templates API] Successfully updated template');

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
    });

  } catch (error) {
    console.error('[Templates API] Error updating:', error);
    return NextResponse.json(
      {
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/templates
 * Delete a report template (or soft delete by setting is_active = false)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const templateId = searchParams.get('template_id');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id && !templateId) {
      return NextResponse.json(
        { error: 'Either id or template_id is required' },
        { status: 400 }
      );
    }

    const whereClause = id
      ? `id = '${escapeSQL(id)}'`
      : `template_id = '${escapeSQL(templateId!)}'`;

    console.log('[Templates API] Deleting template:', id || templateId, 'hard:', hardDelete);

    let query: string;
    if (hardDelete) {
      query = `DELETE FROM \`${TABLE}\` WHERE ${whereClause}`;
    } else {
      // Soft delete - just mark as inactive
      query = `
        UPDATE \`${TABLE}\`
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP()
        WHERE ${whereClause}
      `;
    }

    await runSQLQuery(query);

    console.log('[Templates API] Successfully deleted template');

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Template permanently deleted' : 'Template deactivated',
    });

  } catch (error) {
    console.error('[Templates API] Error deleting:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
