import { tool } from 'ai';
import { z } from 'zod';
import { runSQLQuery } from '@/lib/bigquery';

export const getTableSchema = tool({
  description: 'Get the column names and types for a specific table to help write accurate queries',
  inputSchema: z.object({
    tableName: z.string().describe('Table name (without project/dataset prefix) to get schema for'),
    datasetName: z.string().optional().describe('Dataset name (defaults to jumbomax_analytics)'),
  }),
  execute: async ({ tableName, datasetName = 'jumbomax_analytics' }: { tableName: string; datasetName?: string }) => {
    try {
      const query = `SELECT column_name, data_type, is_nullable 
                     FROM \`intelligence-451803.${datasetName}.INFORMATION_SCHEMA.COLUMNS\` 
                     WHERE table_name = '${tableName}' 
                     ORDER BY ordinal_position`;
      
      console.log('[getTableSchema] Executing schema query:', query);
      const rows = await runSQLQuery(query);
      
      if (!rows || rows.length === 0) {
        return {
          error: true,
          message: `No schema found for table ${tableName} in dataset ${datasetName}. Table may not exist.`,
          tableName,
          datasetName
        };
      }
      
      return {
        success: true,
        tableName,
        datasetName,
        columns: rows,
        message: `Found ${rows.length} columns in table ${tableName}`
      };
    } catch (error) {
      console.error('[getTableSchema] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error getting table schema',
        tableName,
        datasetName
      };
    }
  }
});

export const queryBigQueryDirect = tool({
  description: 'Execute a SQL query directly against BigQuery (use fully qualified table names like `project.dataset.table`)',
  inputSchema: z.object({
    query: z.string().describe('SQL query to execute with fully qualified table names'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      console.log('[queryBigQueryDirect] Executing query:', query);
      const rows = await runSQLQuery(query);
      
      if (!rows || rows.length === 0) {
        return {
          success: true,
          results: [],
          count: 0,
          message: 'Query executed successfully but returned no data'
        };
      }
      
      const response = {
        success: true,
        results: rows.slice(0, 100), // Limit to 100 rows for display
        count: rows.length,
        limitApplied: rows.length > 100,
      };
    
      console.log('[queryBigQueryDirect] Rows returned:', rows.length);
      return response;
    } catch (error) {
      console.error('[queryBigQueryDirect] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error in SQL execution',
        query: query || 'unknown',
      };
    }
  }
});

export const listDatasets = tool({
  description: 'List available datasets in the BigQuery project',
  inputSchema: z.object({
    _placeholder: z.string().optional().describe('No parameters required for this operation')
  }),
  execute: async () => {
    try {
      console.log('[listDatasets] Getting datasets...');
      const { BigQuery } = await import('@google-cloud/bigquery');

      // Use environment-aware credential configuration
      const bigquery = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
          : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
        ),
      });
      
      const [datasets] = await bigquery.getDatasets();
      
      const datasetList = datasets.map(dataset => ({
        id: dataset.id,
        location: dataset.location,
        creationTime: dataset.metadata?.creationTime,
      }));

      return {
        success: true,
        datasets: datasetList
      };
    } catch (error) {
      console.error('[listDatasets] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const listTables = tool({
  description: 'List tables in a specific dataset',
  inputSchema: z.object({
    datasetId: z.string().describe('Dataset ID to list tables from'),
  }),
  execute: async ({ datasetId }: { datasetId: string }) => {
    try {
      console.log('[listTables] Getting tables for dataset:', datasetId);
      const { BigQuery } = await import('@google-cloud/bigquery');

      // Use environment-aware credential configuration
      const bigquery = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
          : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
        ),
      });
      
      const dataset = bigquery.dataset(datasetId);
      const [tables] = await dataset.getTables();
      
      const tableList = tables.map(table => ({
        id: table.id,
        type: table.metadata?.type,
        creationTime: table.metadata?.creationTime,
        numRows: table.metadata?.numRows,
      }));

      return {
        success: true,
        datasetId,
        tables: tableList
      };
    } catch (error) {
      console.error('[listTables] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        datasetId
      };
    }
  }
});

export const describeTable = tool({
  description: 'Get schema information for a specific table',
  inputSchema: z.object({
    datasetId: z.string().describe('Dataset ID containing the table'),
    tableId: z.string().describe('Table ID to describe'),
  }),
  execute: async ({ datasetId, tableId }: { datasetId: string; tableId: string }) => {
    try {
      console.log('[describeTable] Getting schema for:', `${datasetId}.${tableId}`);
      const { BigQuery } = await import('@google-cloud/bigquery');

      // Use environment-aware credential configuration
      const bigquery = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
          : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
        ),
      });
      
      const dataset = bigquery.dataset(datasetId);
      const table = dataset.table(tableId);
      const [metadata] = await table.getMetadata();

      const schema = metadata.schema?.fields?.map((field: any) => ({
        name: field.name,
        type: field.type,
        mode: field.mode,
        description: field.description,
      }));

      return {
        success: true,
        datasetId,
        tableId,
        schema,
        tableInfo: {
          type: metadata.type,
          creationTime: metadata.creationTime,
          numRows: metadata.numRows,
          numBytes: metadata.numBytes,
        }
      };
    } catch (error) {
      console.error('[describeTable] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        datasetId,
        tableId
      };
    }
  }
});