import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { weatherTool, runSQL, composeReport } from "@/app/api/chat/tools";
import { getTableSchema, listDatasets, listTables, describeTable, queryBigQueryDirect } from "@/lib/conversation/bigquery-tools";
import { getClientConfig, CLIENT_CONFIGS } from '@/lib/client-config';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    // Get client ID from header - REQUIRED for request isolation
    const clientId = req.headers.get('x-client-id');

    if (!clientId) {
      return new Response(JSON.stringify({
        error: 'x-client-id header is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate client exists
    if (!CLIENT_CONFIGS[clientId]) {
      return new Response(JSON.stringify({
        error: `Invalid client ID: ${clientId}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clientConfig = getClientConfig(clientId);
    const primaryDataset = clientConfig.bigquery.dataset;

    const body = await req.json();
    const { messages } = body;

    const systemContext = body.systemContext;
    const expectsReport = body.expectsReport;
    const hasPrefetchedData = body.hasPrefetchedData || false;
    const disableTools = body.disableTools || false;
    console.log('Using client:', clientId, 'dataset:', primaryDataset);
    console.log('Custom system context:', systemContext ? 'Yes' : 'No');
    console.log('Has pre-fetched data:', hasPrefetchedData);
    console.log('Disable tools:', disableTools);

    console.log('API received messages:', messages);

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

Use reports for: comprehensive analysis, dashboards, executive summaries, detailed findings with multiple charts/tables, or when visual presentation enhances understanding.

**DATA CACHING FOR ITERATIVE REFINEMENT:**
When generating a report for the first time:
1. Query BigQuery for all necessary data
2. After generating the report, include a hidden data cache in your response using this format:
   <!-- DATA_CACHE_START
   {
     "queries_executed": ["query1", "query2"],
     "cached_data": {
       "dataset_name": [rows of data],
       "another_dataset": [rows of data]
     },
     "timestamp": "ISO timestamp",
     "period": "description of time period"
   }
   DATA_CACHE_END -->

When the user asks for refinements (e.g., "make the intro more excited", "add a comparison table"):
1. **Check the conversation history for DATA_CACHE blocks**
2. **Use the cached data instead of querying BigQuery again**
3. Regenerate the report with modifications using the same data snapshot
4. Include the same DATA_CACHE block in your response to maintain continuity

This ensures:
- Consistent data across refinements
- Faster responses (no database queries)
- Lower token usage (fewer tool calls)
- Better user experience` : `

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
    let systemMessage = systemContext
      ? `${baseSystem}\\n\\n**TASK-SPECIFIC CONTEXT:**\\n${systemContext}`
      : baseSystem;

    // Override system message when pre-fetched data is provided or tools are disabled
    if (hasPrefetchedData || disableTools) {
      systemMessage = `You are a professional marketing analyst and report writer.

**CRITICAL INSTRUCTION:**
${hasPrefetchedData
  ? 'The user has already pre-fetched ALL the data you need from BigQuery. The data is included in the user\'s message.'
  : 'You do NOT have access to BigQuery tools for this request.'
}

**YOU MUST:**
- ${hasPrefetchedData ? 'Use ONLY the data provided in the user\'s message' : 'Work with whatever context is provided'}
- Do NOT attempt to query databases or use data fetching tools
- ${hasPrefetchedData ? 'Generate the report directly from the pre-fetched data provided' : 'Provide analysis based on the information given'}

**RESPONSE FORMAT:**
Generate your response as formatted markdown text.

Structure your response with:
- ## Headings for main sections
- ### Subheadings for subsections
- **Bold** for important metrics and key findings
- Bullet points (-) for lists
- Tables with proper markdown syntax (| Header | Header |) if needed
- Clear, professional language suitable for executives

Keep your response concise, focused, and actionable.`;
    }

    // Conditionally build tools list - exclude ALL tools when pre-fetched data is provided or tools are disabled
    const tools = (hasPrefetchedData || disableTools)
      ? {} // No tools - just generate markdown text directly
      : {
          weatherTool,
          runSQL,
          getTableSchema,
          listDatasets,
          listTables,
          describeTable,
          queryBigQueryDirect,
          composeReport,
        };

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemMessage,
      tools,
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