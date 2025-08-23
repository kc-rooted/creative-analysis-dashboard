import { runSQLQuery } from '@/lib/bigquery';
import { tool } from 'ai';
import { z } from 'zod';
import { Report } from '@/lib/conversation/report-schema';

// Weather Tool
export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }: { location: string }) => {
    try {
      console.log('[weatherTool] Input:', location);
      
      // Validate input
      if (!location || typeof location !== 'string' || location.trim() === '') {
        throw new Error('Invalid location provided');
      }
      
      const response = {
        location,
        temperature: 52 + Math.floor(Math.random() * 21) - 10,
        unit: 'Fahrenheit',
      };
    
      console.log('[weatherTool] Response:', response);
      return response;
    } catch (error) {
      console.error('[weatherTool] Error:', error);
      // Return a structured error that Claude can understand
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error in weather tool',
        location: location || 'unknown',
      };
    }
  },
});

// SQL Tool
export const runSQL = tool({
  description: 'Execute SQL in BigQuery and return the result as JSON rows',
  inputSchema: z.object({
    query: z.string().describe('The SQL query to run against BigQuery'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      console.log('[runSQL] Received query:', query);
      
      // Validate input
      if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('Invalid SQL query provided');
      }
      
      // Basic SQL injection protection
      if (query.toLowerCase().includes('drop table') || 
          query.toLowerCase().includes('delete from') ||
          query.toLowerCase().includes('truncate table')) {
        throw new Error('Potentially destructive SQL operations are not allowed');
      }
      
      const rows = await runSQLQuery(query);
      
      // Handle empty results
      if (!rows || rows.length === 0) {
        return {
          results: [],
          message: 'Query executed successfully but returned no data'
        };
      }
      
      const response = {
        results: rows.slice(0, 365),
        count: rows.length,
        limitApplied: rows.length > 365,
      };
    
      console.log('[runSQL] Rows returned:', rows.length);
      return response;
    } catch (error) {
      console.error('[runSQL] Error:', error);
      // Return a structured error that Claude can understand
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error in SQL execution',
        query: query || 'unknown',
      };
    }
  },
});

// Report Composition Tool
export const composeReport = tool({
  description: 'Compose a structured report with multiple sections, columns, and visual blocks including charts, tables, KPIs, and text',
  inputSchema: Report,
  execute: async (report) => {
    try {
      console.log('[composeReport] Creating report:', report.title || 'Untitled Report');
      console.log('[composeReport] Sections:', report.sections.length);
      
      // Validate the report structure
      if (!report.sections || report.sections.length === 0) {
        throw new Error('Report must contain at least one section');
      }
      
      // Count blocks for logging
      const totalBlocks = report.sections.reduce((sum, section) => sum + section.blocks.length, 0);
      console.log('[composeReport] Total blocks:', totalBlocks);
      
      // Return the report data for rendering
      return {
        component: 'Report',
        props: report,
        message: `Created ${report.title || 'report'} with ${report.sections.length} section(s) and ${totalBlocks} block(s)`
      };
    } catch (error) {
      console.error('[composeReport] Error:', error);
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error in report composition',
      };
    }
  },
});