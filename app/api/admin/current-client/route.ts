import { NextRequest, NextResponse } from 'next/server';
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

// GET - Get current active client
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
      // Fallback to environment variable
      return NextResponse.json({ 
        clientId: process.env.CURRENT_CLIENT_ID || 'jumbomax' 
      });
    }
  } catch (error) {
    console.error('Error fetching current client:', error);
    // Fallback to environment variable
    return NextResponse.json({ 
      clientId: process.env.CURRENT_CLIENT_ID || 'jumbomax' 
    });
  }
}

// POST - Set current active client
export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Ensure admin infrastructure exists
    await ensureCurrentClientTable();

    // Clear existing current client settings and insert new one
    await bigquery.query(`
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CURRENT_CLIENT_TABLE}\`
      WHERE TRUE
    `);

    await bigquery.query({
      query: `
        INSERT INTO \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${ADMIN_DATASET}.${CURRENT_CLIENT_TABLE}\`
        (client_id, updated_at)
        VALUES (@client_id, CURRENT_TIMESTAMP())
      `,
      params: { client_id: clientId },
    });

    return NextResponse.json({ success: true, clientId });
  } catch (error) {
    console.error('Error setting current client:', error);
    return NextResponse.json(
      { error: 'Failed to set current client' },
      { status: 500 }
    );
  }
}

// Helper function to ensure current client table exists
async function ensureCurrentClientTable() {
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
    const table = dataset.table(CURRENT_CLIENT_TABLE);
    const [tableExists] = await table.exists();

    if (!tableExists) {
      const schema = [
        { name: 'client_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await table.create({ schema });
      console.log(`Created table: ${CURRENT_CLIENT_TABLE}`);
    }
  } catch (error) {
    console.error('Error ensuring current client table:', error);
    throw error;
  }
}