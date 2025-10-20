import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { weatherTool, runSQL, composeReport } from "@/app/api/chat/tools";
import { getTableSchema, listDatasets, listTables, describeTable, queryBigQueryDirect } from "@/lib/conversation/bigquery-tools";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;
    
    // Extract selectedClient from request body
    const selectedClient = body.selectedClient || 'jumbomax';
    const systemContext = body.systemContext;
    const expectsReport = body.expectsReport;
    console.log('Body selectedClient:', body.selectedClient);
    console.log('Custom system context:', systemContext ? 'Yes' : 'No');
    
    console.log('API received messages:', messages);
    console.log('Selected client:', selectedClient);
    
    // Map client to dataset
    const clientDatasetMap = {
      'jumbomax': 'jumbomax_analytics',
      'lab': 'lab_analytics', 
      'hb': 'hb_analytics'
    };
    
    const primaryDataset = clientDatasetMap[selectedClient as keyof typeof clientDatasetMap] || 'jumbomax_analytics';

    // Convert UI messages to model messages format for AI SDK 5.0
    const modelMessages = convertToModelMessages(messages);
    console.log('Converted model messages:', modelMessages);

    // Build system message with conditional reporting instructions
    const reportingInstructions = expectsReport ? `

**REPORTING CAPABILITIES:**
When you need to present comprehensive analysis with visualizations, use the \`composeReport\` tool to create structured reports with:
- **Text blocks**: Headers (h1-h6), paragraphs, and formatted content
- **KPI blocks**: Key metrics with values, change indicators, and trend arrows  
- **Table blocks**: Structured data presentations with optional titles
- **Chart blocks**: Data visualizations using either:
  - Basic charts: line, bar, area, pie (specify type, x/y axes, and data rows)
  - Advanced Vega-Lite charts: Custom JSON specifications for complex visualizations
- **Image blocks**: Referenced images with alt text and captions
- **Layout control**: Organize content in 1-4 column sections for professional layouts

**IMPORTANT:** When using composeReport, provide only a brief confirmation message in your response (e.g., "I've created a comprehensive marketing report analyzing your campaign performance."). Do NOT duplicate the report content in your text response. 

The report should be complete and self-contained with:
- **Executive Summary section** at the top with key findings and recommendations
- **Data analysis sections** with charts, tables, and KPIs
- **Detailed insights section** with thorough analysis
- **Conclusions and Next Steps section** at the bottom with actionable recommendations

Include ALL analysis, insights, conclusions, and recommendations within the report structure itself using appropriate text blocks, headings, and formatting.

Use reports for: comprehensive analysis, dashboards, executive summaries, detailed findings with multiple charts/tables, or when visual presentation enhances understanding.` : `

**ANALYSIS APPROACH:**
Provide direct analysis in your response without using the composeReport tool. Focus on:
- Clear, concise insights with proper formatting
- Key metrics and findings presented in text
- **IMPORTANT**: For tabular data, always use proper markdown table syntax with alignment
- Format tables with pipes and dashes for proper rendering
- Ensure tables have proper spacing and are well-formatted
- Use bullet points for lists and key insights
- Direct recommendations and conclusions
- Quick, actionable summaries`;

    const baseSystem = `You are a professional data analyst assistant with access to BigQuery databases. Always format your responses professionally with clear structure.

**RESPONSE FORMATTING REQUIREMENTS:**
- Use ## for main headings and ### for subheadings
- Use bullet points (-) for lists and key insights
- Use numbered lists (1., 2., 3.) for step-by-step processes
- Use **bold** for important metrics, numbers, and key findings
- Use code blocks for SQL queries when showing examples
- Always provide clear summaries and actionable insights
- Do not include any emojis in your final summary or analysis.${reportingInstructions}

**Available Tools:**
- **listDatasets:** See all available datasets in the project
- **listTables:** See all tables in a specific dataset  
- **describeTable:** Get detailed schema for any table (recommended over getTableSchema)
- **getTableSchema:** Get basic column info for tables
- **runSQL:** Execute SQL queries (preferred for most queries)
- **queryBigQueryDirect:** Alternative SQL execution method
- **composeReport:** Create structured reports with charts, tables, KPIs, and multi-column layouts

**Analysis Workflow:**
1. **Discover** available data using listDatasets and listTables
2. **Examine** table structures using describeTable before querying
3. **Query** data using fully qualified names: intelligence-451803.${primaryDataset}.table_name
4. **Analyze** results and provide formatted insights with clear headers and bullets
5. **Summarize** findings with actionable recommendations

**Current Context:**
- **Project:** intelligence-451803
- **Primary Dataset:** ${primaryDataset}

Always structure your responses with clear headings, use bullet points for key insights, and provide professional, easy-to-read summaries of your findings.`;

    // Add custom context if provided
    const systemMessage = systemContext 
      ? `${baseSystem}\\n\\n**TASK-SPECIFIC CONTEXT:**\\n${systemContext}`
      : baseSystem;

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemMessage,
      tools: {
        weatherTool,
        runSQL,
        getTableSchema,
        listDatasets,
        listTables,
        describeTable,
        queryBigQueryDirect,
        composeReport,
      },
       stopWhen: stepCountIs(10), // Intelligent stopping condition,
      messages: modelMessages,
      onFinish: async (result) => {
        // Log any errors for debugging
        if ('error' in result && result.error) {
          console.error('Stream finished with error:', result.error);
        }
        // Log usage information if available
        if (result.usage) {
          console.log('Usage data:', result.usage);
          // Note: Can't modify result.text as it's readonly
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Route handler error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}