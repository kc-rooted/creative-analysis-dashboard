// Prompt templates with specific system context and user prompts

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'marketing' | 'sales' | 'business' | 'quick';
  userPrompt: string;
  systemContext: string;
  expectsReport: boolean;
}

export const promptTemplates: PromptTemplate[] = [
  // Quick Queries (shown first)
  {
    id: 'top-campaigns',
    title: 'Top Performing Campaigns',
    category: 'quick',
    userPrompt: 'Show me the top performing marketing campaigns from the last month with key metrics',
    systemContext: `Provide a quick analysis of top campaigns with:
- Clear ranking by performance metrics
- Key metrics for each campaign (ROAS, conversions, spend)
- Brief insights on what made them successful
- Use tables and simple charts for easy scanning`,
    expectsReport: false
  },
  {
    id: 'revenue-trends',
    title: 'Revenue Trends',
    category: 'quick',
    userPrompt: 'Show me revenue trends for the past 6 months with growth rates',
    systemContext: `Focus on clear, concise revenue trend analysis:
- Monthly revenue progression
- Growth rate calculations
- Key trend observations
- Simple line charts showing trajectory
- Brief summary of performance highlights`,
    expectsReport: false
  },
  {
    id: 'conversion-rates',
    title: 'Conversion Rate Analysis',
    category: 'quick',
    userPrompt: 'Analyze conversion rates across different channels and campaigns',
    systemContext: `Provide focused conversion rate analysis:
- Conversion rates by channel/campaign
- Comparative analysis of performance
- Identify best and worst performers
- Simple charts and tables for quick insights
- Brief recommendations for improvement`,
    expectsReport: false
  },

  // Full Reports
  {
    id: 'marketing-performance-report',
    title: 'Marketing Performance Report',
    category: 'marketing',
    userPrompt: 'Create a comprehensive monthly marketing highlights report for the previous month with year-over-year comparisons, channel performance analysis, and strategic insights',
    systemContext: `You are a professional marketing analyst tasked with creating a comprehensive monthly marketing highlights report using composeReport.

CORE INSTRUCTIONS:
- Produce a detailed, data-driven report for THE PREVIOUS MONTH (e.g., if today is in September, analyze August data)
- Compare the previous month's performance with the same month in the previous year
- Use precise numerical data and clear percentage calculations
- Maintain a professional, insightful narrative tone

REPORT STRUCTURE:

1. REPORT HEADER
- Title: "[Previous Month Year] Marketing Highlights" (e.g., "August 2024 Marketing Highlights" if running in September)
- Prepared By: "[Your Company Name]"

2. SALES OVERVIEW
Provide a breakdown of sales performance for the previous month:
a) Direct-to-Consumer (DTC) Channel:
- Total sales for previous month
- Total sales for same month last year
- Calculate and display Year-over-Year (YoY) Growth percentage

3. SALES ANALYSIS
a) Summary Overview:
- Total revenue across all product categories
- Key growth drivers
- Highlight products with significant performance increases

b) Product Category Deep Dive:
For each major product category, analyze:
- Total units sold (previous month vs. same month previous year)
- Total net sales (previous month vs. same month previous year)
- Percentage growth
- Top-performing individual products
- Specific insights into performance drivers

4. MARKETING CHANNEL ANALYSIS
a) Paid Media Performance:
- Pay-Per-Click (PPC) Ads:
  * Return on Ad Spend (ROAS)
  * Total ad spend
  * Total ad revenue
  * Ad spend as a percentage of total sales
- Social Media Advertising:
  * Performance by platform (Meta, Google, etc.)
  * ROAS for each platform
  * Revenue attributed to ad campaigns
  * Year-over-year growth in ad performance

b) Email Marketing with Klaviyo:
- Total email marketing revenue
- Revenue from email campaigns
- Revenue from automated email flows
- Email marketing performance as a percentage of total sales
- Top-performing email campaigns

5. STRATEGIC INSIGHTS
- Key takeaways from the previous month's performance
- Recommendations for future strategy
- Potential areas of opportunity or improvement
- Any insight into product performance trends

FORMAT REQUIREMENTS:
- Use clear, professional language
- Include specific numerical data with KPI cards and charts
- Provide context and analysis, not just raw numbers
- Maintain a positive, forward-looking tone
- Ensure the report is comprehensive yet concise
- Use appropriate visualizations (bar charts for comparisons, line charts for trends, tables for detailed data)

OUTPUT EXPECTATIONS:
Deliver a well-structured, easily readable report that provides a complete picture of the previous month's marketing performance, with clear insights and strategic recommendations.`,
    expectsReport: true
  },
  {
    id: 'sales-dashboard',
    title: 'Sales Performance Dashboard',
    category: 'sales',
    userPrompt: 'Generate an executive sales dashboard with KPIs, trends, and performance insights',
    systemContext: `Create a comprehensive sales dashboard using composeReport with:
- Sales KPIs (revenue, growth rate, conversion rate)
- Revenue trend charts and forecasting
- Sales funnel visualization
- Top performers and product analysis
- Regional/territory performance comparison
- Sales target vs actual performance`,
    expectsReport: true
  },
  {
    id: 'monthly-business-review',
    title: 'Monthly Business Review',
    category: 'business',
    userPrompt: 'Create a monthly business review report with key metrics, insights, and strategic recommendations',
    systemContext: `Generate a comprehensive business review using composeReport including:
- Executive summary of business performance
- Key business metrics and KPIs
- Comparative analysis (month-over-month, year-over-year)
- Operational efficiency metrics
- Strategic insights and market analysis
- Action items and recommendations for leadership`,
    expectsReport: true
  },

];

export function getPromptById(id: string): PromptTemplate | undefined {
  return promptTemplates.find(template => template.id === id);
}

export function getPromptsByCategory(category: PromptTemplate['category']): PromptTemplate[] {
  return promptTemplates.filter(template => template.category === category);
}