import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery();
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