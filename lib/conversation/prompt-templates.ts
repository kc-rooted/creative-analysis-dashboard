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
    userPrompt: 'Create a comprehensive marketing performance report analyzing ROI, conversion rates, and campaign effectiveness across all channels',
    systemContext: `Focus on creating a detailed marketing analysis report using composeReport. Include:
- Executive summary with key marketing metrics
- KPI cards showing ROAS, conversion rates, cost per acquisition
- Charts comparing channel performance (bar charts for spending, line charts for trends)
- Table of top performing campaigns
- Detailed insights on optimization opportunities
- Actionable recommendations for budget allocation`,
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