import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ),
});
let sqlResults = '';

export async function runSchemaQuery(sql: string) {
    // Create SQL 
   const [rows] = await bigquery.query(sql);
   return rows;
 
 }


export async function getDatasetSchema(datasetRef: string) {
    const query = `
        SELECT table_name, column_name, data_type
        FROM \`${datasetRef}.INFORMATION_SCHEMA.COLUMNS\`
    `;
  
    const rows = await runSchemaQuery(query);
  
    const schema: Record<string, Record<string, string>> = {};
  
    for (const row of rows) {
      const { table_name, column_name, data_type } = row;
  
      if (!schema[table_name]) {
        schema[table_name] = {};
      }
  
      schema[table_name][column_name] = data_type;
    }
  
    return schema;
  }