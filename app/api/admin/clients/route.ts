import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});

// We'll store client configs in BigQuery for now
const ADMIN_DATASET = 'admin_configs';
const CLIENT_CONFIGS_TABLE = 'client_configurations';

// GET - Fetch all client configurations
export async function GET() {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CLIENT_CONFIGS_TABLE}\`
      ORDER BY name
    `;

    const [rows] = await bigquery.query(query);
    
    // Parse JSON fields back to objects
    const clients = rows.map(row => ({
      ...row,
      bigquery: JSON.parse(row.bigquery_config),
      brand: JSON.parse(row.brand_config),
      analysis: JSON.parse(row.analysis_config),
    }));

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching client configurations:', error);
    
    // Fallback to hardcoded config if table doesn't exist yet
    const fallbackConfigs = [
      {
        id: 'jumbomax',
        name: 'JumboMax Golf',
        bigquery: { dataset: 'jumbomax_analytics' },
        brand: {
          colors: [
            { name: 'JumboMax Blue', hex: '#1B4F72', description: 'Primary brand blue', usage: 'primary_brand' },
            { name: 'JumboMax Orange', hex: '#E67E22', description: 'Secondary accent color', usage: 'accent' },
            { name: 'White', hex: '#FFFFFF', description: 'Clean background', usage: 'background' },
            { name: 'Dark Gray', hex: '#2C3E50', description: 'Primary text', usage: 'text' },
            { name: 'Light Gray', hex: '#95A5A6', description: 'Secondary text', usage: 'secondary_text' },
          ],
          industry: 'golf_equipment',
          targetAudience: ['golf_enthusiasts', 'performance_golfers'],
          productCategories: ['golf_grips', 'golf_accessories'],
          brandPersonality: 'premium_performance_focused_innovative',
          competitiveContext: 'competing_against_traditional_golf_grip_manufacturers',
        },
        analysis: {
          focusAreas: ['performance', 'brand_compliance', 'golf_appeal'],
          customPromptAdditions: 'Focus specifically on golf equipment marketing appeal.',
        },
      }
    ];

    return NextResponse.json(fallbackConfigs);
  }
}

// POST - Save/update client configuration
export async function POST(request: NextRequest) {
  try {
    const clientConfig = await request.json();

    // Create the admin dataset and table if they don't exist
    await ensureAdminInfrastructure();

    const query = `
      MERGE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CLIENT_CONFIGS_TABLE}\` AS target
      USING (
        SELECT
          @id as id,
          @name as name,
          PARSE_JSON(@bigquery_config) as bigquery_config,
          PARSE_JSON(@brand_config) as brand_config,
          PARSE_JSON(@analysis_config) as analysis_config,
          CURRENT_TIMESTAMP() as updated_at
      ) AS source
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET
        name = source.name,
        bigquery_config = source.bigquery_config,
        brand_config = source.brand_config,
        analysis_config = source.analysis_config,
        updated_at = source.updated_at
      WHEN NOT MATCHED THEN INSERT
        (id, name, bigquery_config, brand_config, analysis_config, created_at, updated_at)
      VALUES
        (source.id, source.name, source.bigquery_config, source.brand_config, source.analysis_config, CURRENT_TIMESTAMP(), source.updated_at)
    `;

    await bigquery.query({
      query,
      params: {
        id: clientConfig.id,
        name: clientConfig.name,
        bigquery_config: JSON.stringify(clientConfig.bigquery),
        brand_config: JSON.stringify(clientConfig.brand),
        analysis_config: JSON.stringify(clientConfig.analysis),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving client configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save client configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove client configuration
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CLIENT_CONFIGS_TABLE}\`
      WHERE id = @client_id
    `;

    await bigquery.query({
      query,
      params: { client_id: clientId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete client configuration' },
      { status: 500 }
    );
  }
}

// Helper function to ensure admin infrastructure exists
async function ensureAdminInfrastructure() {
  try {
    // Create dataset if it doesn't exist
    const dataset = bigquery.dataset(ADMIN_DATASET);
    const [datasetExists] = await dataset.exists();
    
    if (!datasetExists) {
      await dataset.create({
        location: 'US',
      });
      console.log(`Created dataset: ${ADMIN_DATASET}`);
    }

    // Create table if it doesn't exist
    const table = dataset.table(CLIENT_CONFIGS_TABLE);
    const [tableExists] = await table.exists();

    if (!tableExists) {
      const schema = [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'bigquery_config', type: 'JSON', mode: 'REQUIRED' },
        { name: 'brand_config', type: 'JSON', mode: 'REQUIRED' },
        { name: 'analysis_config', type: 'JSON', mode: 'REQUIRED' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await table.create({ schema });
      console.log(`Created table: ${CLIENT_CONFIGS_TABLE}`);
    }
  } catch (error) {
    console.error('Error ensuring admin infrastructure:', error);
    throw error;
  }
}