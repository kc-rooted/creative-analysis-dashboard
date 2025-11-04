'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from "@/components/conversation/input"
import { Button } from "@/components/conversation/button"
import { ArrowUpFromDot, ChevronLeft, ChevronRight, FileText, Download, Loader2, CheckCircle, Cog, X, FileDown } from "lucide-react"
import { MemoizedMarkdown } from '@/components/conversation/memoized-markdown';
import { useClient } from '@/components/client-provider';
import React, { useState } from 'react';
import { AdCreativeCard } from '@/app/reports/components/ReportSection';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/conversation/avatar"

// Report template interface
interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  clients: string[];
  prompt: string;
}

// Report templates
const reportTemplates: ReportTemplate[] = [
  {
    id: 'weekly-executive',
    title: 'Weekly Executive Summary',
    description: 'High-level overview of key metrics and trends',
    category: 'executive',
    icon: '📊',
    clients: ['all'], // Available to all clients
    prompt: 'Generate a weekly executive summary report for {{client}} covering key performance metrics, trends, and notable insights from the past 7 days.'
  },
  {
    id: 'monthly-performance',
    title: 'Monthly Performance Review',
    description: 'Comprehensive monthly analysis',
    category: 'performance',
    icon: '📈',
    clients: ['all'], // Available to all clients
    prompt: `You are a marketing analytics expert generating a comprehensive monthly marketing report for {{client}} for the last 30 days.

REPORT STRUCTURE:
Generate a strategic, executive-level monthly marketing report with the following sections:

1. EXECUTIVE SUMMARY (1-2 paragraphs)
   - Use ai_executive_summary for latest MTD metrics
   - Use client_configurations for monthlyRevenueTargets
   - Create a budget pacing bullet discussing the percentage of this month's budget and the pacing toward annual
   - Highlight top 3-5 key insights from the month
   - Focus on business impact and YoY performance
   - Include both wins and challenges
   - Format the 3-5 insights as bullet points

2. BUSINESS PERFORMANCE
   - Use monthly_business_summary for complete monthly metrics
   - Report on attributed_blended_roas as well as overall blended_roas which represents net revenue / ad spend
   - Present revenue breakdown (gross, net, refunds)
   - Analyze operational metrics (orders, AOV, units)
   - Calculate and interpret key rates (discount, return, etc.)

3. PAID MEDIA PERFORMANCE
   IF facebook_spend_mtd > 0 in ai_executive_summary:
      - Analyze Facebook performance and trends
   IF google_spend_mtd > 0 in ai_executive_summary:
      - Analyze Google Ads performance and trends
   - Present blended ROAS and attribution insights
   - Compare platform efficiency and ROI

4. CAMPAIGN ANALYSIS
   - Use ai_intelligent_campaign_analysis
   - Identify top 5 performing campaigns with context
   - Flag campaigns needing attention (use recommended_action, risk_flags)
   - Provide 2-3 specific optimization recommendations
   - Highlight the best TOFU Ad (highest CTR)
   - Highlight the best MOFU Ad (highest ROAS and/or best conversions)

5. PRODUCT INSIGHTS
   - Use product_intelligence for top performers
   - Identify growth trends and opportunities
   - Flag inventory or performance concerns

6. STRATEGIC RECOMMENDATIONS
   Focus the strategic recommendations only on Paid Media Performance

TONE & FORMAT:
- Write at a strategic/executive level (50,000 foot view)
- Use clear, uncomplicated business-focused language, avoid jargon
- Include specific numbers but emphasize insights over data dumps
- Use bullet points for scannability
- Bold key metrics and findings
- Keep total report to 1,000 words
- Do not use any emojis
- Do not use horizontal rules (---) or <hr> tags

CRITICAL REQUIREMENTS:
- Always compare MTD vs YoY to show context
- Calculate growth rates and interpret them
- Identify both opportunities and risks
- Be specific with recommendations (don't be vague)
- Focus on actionable intelligence, not just reporting numbers
- Never speak in absolute truths around your recommendations, they are simply recommendations and not facts
- Do not panic or use panic-sounding statements or overly enthusiastic statements as well`
  },
  {
    id: 'platform-deep-dive',
    title: 'Platform Deep Dive',
    description: 'In-depth analysis of a specific platform',
    category: 'analysis',
    icon: '🔍',
    clients: ['all'],
    prompt: 'Provide a deep-dive analysis of {{platform}} performance for {{client}}, including ad-level insights, audience performance, and optimization recommendations.'
  },
  {
    id: 'email-retention',
    title: 'Email & Retention Report',
    description: 'Email marketing and customer retention metrics',
    category: 'marketing',
    icon: '📧',
    clients: ['all'],
    prompt: 'Generate an email marketing and customer retention report for {{client}}, covering campaign performance, subscriber engagement, and retention trends.'
  },

  // ========== CLIENT-SPECIFIC TEMPLATES ==========

  // Example: H&B-specific monthly report
  {
    id: 'hb-monthly-performance',
    title: 'H&B Monthly Performance',
    description: 'Custom monthly report for Holderness & Bourne',
    category: 'performance',
    icon: '📈',
    clients: ['hb'], // Only visible to H&B
    prompt: `You are a marketing analytics expert generating a comprehensive monthly marketing report for Holderness & Bourne.

REPORT HEADER:
Start the report with an H3 heading showing the report month and year (e.g., "### October 2025"). DO NOT use "Last 30 days" anywhere in the report.

REPORT STRUCTURE:
Generate a strategic, executive-level monthly marketing report with the following sections:

1. EXECUTIVE SUMMARY
   **Format**: 1-2 sentence summary paragraph, followed by hero metrics table, then key insights

   **Summary**: Brief strategic overview (1-2 sentences) about overall business performance

   **Hero Metrics Table** (use data from HERO METRICS and ANNUAL REVENUE FORECAST sections):
   Create a table with 3 columns: Metric | Value | Analysis

   | Metric | Value | Analysis |
   |--------|-------|----------|
   | **Monthly Revenue** | $[current month revenue] | MoM: [+/-X]%, YoY: [+/-X]% |
   | **Annual Revenue Pacing** | $[forecasted annual revenue - Base Scenario] | [X]% probability to hit $[target]. Shortfall: $[target minus forecast], [X] days left |
   | **Monthly ROAS** | [X.XX]x | MoM: [+/-X]%, YoY: [+/-X]% |
   | **Paid Media Spend** | $[current month spend] | MoM: [+/-X]%, YoY: [+/-X]% |
   | **Top Performing SKU** | [Product Name] | Revenue: $[amount] |
   | **Top Emerging SKU** | [Product Name] | Revenue: $[amount], MoM: [+/-X]% |

   CRITICAL INSTRUCTIONS:
   - Row 1 (Monthly Revenue): Use revenue_total from HERO METRICS with revenue_mom_pct and revenue_yoy_pct
   - Row 2 (Annual Revenue Pacing): Use prophet_annual_revenue_base with probability_hit_revenue_target. Calculate shortfall as (annual_revenue_target - prophet_annual_revenue_base)
   - Row 3 (Monthly ROAS): Use blended_roas from HERO METRICS with blended_roas_mom_pct and blended_roas_yoy_pct
   - Row 4 (Paid Media Spend): Use paid_media_spend from HERO METRICS with paid_media_spend_mom_pct and paid_media_spend_yoy_pct
   - Do NOT calculate percentages - use exact values from the data

   **After the table**, add 3-5 key bullet points with insights about wins and challenges

   NOTE: Section headings should use the standard H2 (##) format. Subsections can use H3/H4 as appropriate.

2. BUSINESS PERFORMANCE
   - Use monthly_business_summary for complete monthly metrics
   - Report on attributed_blended_roas as well as overall blended_roas which represents net revenue / ad spend
   - Present revenue breakdown (gross, net, refunds)
   - Analyze operational metrics (orders, AOV, units)
   - Calculate and interpret key rates (discount, return, etc.)

3. PAID MEDIA PERFORMANCE
   IF facebook_spend_mtd > 0 in ai_executive_summary:
      - Analyze Facebook performance and trends
   IF google_spend_mtd > 0 in ai_executive_summary:
      - Analyze Google Ads performance and trends
   - Present blended ROAS and attribution insights
   - Compare platform efficiency and ROI

4. CAMPAIGN ANALYSIS
   - Use ai_intelligent_campaign_analysis
   - Identify top 5 performing campaigns with context
   - Flag campaigns needing attention (use recommended_action, risk_flags)
   - Provide 2-3 specific optimization recommendations
   - Note: Top ads by funnel stage will be added separately

5. PRODUCT INSIGHTS
   - Use product_intelligence for top performers
   - Identify growth trends and opportunities
   - Flag inventory or performance concerns
   - H&B Focus: Emphasize golf apparel seasonal trends

6. STRATEGIC RECOMMENDATIONS
   - Focus on Paid Media Performance
   - H&B-specific: Consider golf season timing and weather impact

TONE & FORMAT:
- Write at a strategic/executive level (50,000 foot view)
- Use clear, uncomplicated business-focused language, avoid jargon
- Include specific numbers but emphasize insights over data dumps
- Use bullet points for scannability
- Bold key metrics and findings
- Keep total report to 1,000 words
- Do not use any emojis
- CRITICAL: Do NOT use horizontal rules (---) or <hr> tags anywhere in the report
- CRITICAL: Do NOT use "Last 30 days" - use the actual month name and year (e.g., "October 2025")

CRITICAL REQUIREMENTS:
- Always compare MTD vs YoY to show context
- Calculate growth rates and interpret them
- Identify both opportunities and risks
- Be specific with recommendations (don't be vague)
- Focus on actionable intelligence, not just reporting numbers
- Never speak in absolute truths around your recommendations, they are simply recommendations and not facts
- Do not panic or use panic-sounding statements or overly enthusiastic statements as well`
  },
];

// Helper function to get templates available for current client
function getAvailableTemplates(currentClient: string) {
  return reportTemplates.filter(template =>
    !template.clients ||
    template.clients.includes('all') ||
    template.clients.includes(currentClient)
  );
}

// Component to render funnel ads section
function FunnelAdsSection({ funnelAds }: { funnelAds: any }) {
  if (!funnelAds) return null;

  const stageLabels: Record<string, string> = {
    'TOFU': 'Top of Funnel',
    'MOFU': 'Middle of Funnel',
    'BOFU': 'Bottom of Funnel'
  };

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Top Ads by Funnel Stage
      </h2>

      {['TOFU', 'MOFU', 'BOFU'].map(stage => {
        if (!funnelAds[stage]?.length) return null;

        return (
          <div key={stage} className="mb-8">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {stage} ({stageLabels[stage]})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {funnelAds[stage].slice(0, 3).map((ad: any, index: number) => {
                const imageUrl =
                  ad.creative_type === 'VIDEO' && ad.thumbnail_url
                    ? ad.thumbnail_url
                    : ad.image_url || ad.thumbnail_url;

                return imageUrl ? (
                  <AdCreativeCard
                    key={index}
                    adName={ad.ad_name}
                    imageUrl={imageUrl}
                    metrics={{
                      allStarRank: ad.all_star_rank,
                      roas: ad.roas,
                      ctr: ad.ctr_percent,
                      cpc: ad.cpc,
                    }}
                  />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const { currentClient } = useClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [input, setInput] = useState<string>('');
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState<string>('');
  const [pdfExportState, setPdfExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [pdfExportMessage, setPdfExportMessage] = useState<string>('');
  const [funnelAdsData, setFunnelAdsData] = useState<any>(null); // Store funnel ads for client-side injection


  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `reports-${currentClient}`,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Report generation finished:', message);
    },
  });

  // Get templates available for current client
  const availableTemplates = getAvailableTemplates(currentClient);

  // Reset messages when client changes and auto-select client-specific template
  React.useEffect(() => {
    console.log('Client changed to:', currentClient);
    setMessages([]);

    // Auto-select client-specific monthly performance template if available
    const clientSpecificTemplate = reportTemplates.find(
      t => t.id === `${currentClient}-monthly-performance`
    );

    if (clientSpecificTemplate) {
      console.log('[Reports] Auto-selecting client-specific template:', clientSpecificTemplate.id);
      setSelectedTemplate(clientSpecificTemplate);
      const promptWithClient = clientSpecificTemplate.prompt.replace(
        /\{\{client\}\}/g,
        getClientDisplayName(currentClient)
      );
      setInput(promptWithClient);
    } else {
      setSelectedTemplate(null);
      setInput('');
    }
  }, [currentClient, setMessages]);

  const isGenerating = status === 'streaming' || status === 'submitted';
  const isProcessing = isGenerating || isPrefetching;

  // Helper to get display name for client
  const getClientDisplayName = (clientId: string) => {
    const clientNames: Record<string, string> = {
      'jumbomax': 'JumboMax',
      'puttout': 'PuttOut',
      'hb': 'Holderness & Bourne'
    };
    return clientNames[clientId] || clientId.toUpperCase();
  };

  const handleTemplateSelect = async (template: ReportTemplate) => {
    console.log('[Reports] Template selected:', template.id);
    setSelectedTemplate(template);
    // Replace {{client}} placeholder with proper display name
    const promptWithClient = template.prompt.replace(/\{\{client\}\}/g, getClientDisplayName(currentClient));
    setInput(promptWithClient);
  };

  const loadSampleReport = () => {
    // Create a sample report message
    const sampleReport = `## Executive Summary

**Holderness & Bourne** delivered strong performance in October 2024, with **$487,234** in net revenue and a blended ROAS of **3.24x**. The business is tracking at **94% of monthly revenue target** with 8 days remaining in the month.

**Key Insights:**
- Facebook advertising efficiency improved **18% MoM** with ROAS climbing to 3.8x
- Google Shopping campaigns maintained strong **4.2x ROAS** with 15% revenue growth
- Average order value increased to **$142.50** (+8% YoY)
- Customer acquisition costs decreased **12%** compared to September
- Cart abandonment rate improved to **68%** from 72% previous month

## Business Performance

October business metrics show healthy growth across core KPIs:

| Metric | Value | vs. Last Month | vs. Last Year |
|--------|-------|---------------|---------------|
| **Net Revenue** | $487,234 | +12% | +24% |
| **Gross Revenue** | $521,890 | +10% | +22% |
| **Orders** | 3,421 | +8% | +19% |
| **AOV** | $142.50 | +8% | +4% |
| **Units Sold** | 8,547 | +11% | +21% |

**Attributed Blended ROAS:** 3.89x (up from 3.64x last month)
**Overall Blended ROAS:** 3.24x (net revenue / ad spend)

The **discount rate** held steady at 18%, while the **return rate** improved to 6.2% from 7.1% last month, indicating better product-market fit and customer satisfaction.

## Paid Media Performance

### Facebook Ads
Facebook campaigns delivered exceptional results with **$238,450** in attributed revenue on **$62,750** in spend, achieving a **3.8x ROAS**.

- Prospecting campaigns improved CTR to **2.4%** (+0.3% MoM)
- Retargeting audiences maintained **5.2x ROAS**
- Video creative performance increased **22%** in engagement
- Cost per purchase decreased to **$28.50** (-15% MoM)

### Google Ads
Google Ads generated **$186,890** in revenue on **$44,500** spend with a **4.2x ROAS**.

- Shopping campaigns continue to be the top performer at 4.8x ROAS
- Brand campaigns maintained high 8.2x ROAS with low CPCs
- Search campaigns saw 12% improvement in conversion rate
- Display remarketing contributed 18% of total Google revenue

## Top Ads by Funnel Stage

Performance leaders across the marketing funnel:`;

    const sampleAds = {
      TOFU: [
        {
          ad_name: "Fall Collection Launch - Video",
          image_url: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400",
          creative_type: "VIDEO",
          thumbnail_url: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400",
          all_star_rank: 95,
          roas: 2.8,
          ctr_percent: 3.2,
          cpc: 0.45
        },
        {
          ad_name: "Golf Performance Wear - Carousel",
          image_url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400",
          creative_type: "IMAGE",
          all_star_rank: 88,
          roas: 2.5,
          ctr_percent: 2.9,
          cpc: 0.52
        },
        {
          ad_name: "New Arrivals Showcase",
          image_url: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
          creative_type: "IMAGE",
          all_star_rank: 82,
          roas: 2.3,
          ctr_percent: 2.7,
          cpc: 0.58
        }
      ],
      MOFU: [
        {
          ad_name: "Customer Testimonials - Video",
          image_url: "https://images.unsplash.com/photo-1556306535-38febf6782e7?w=400",
          creative_type: "VIDEO",
          thumbnail_url: "https://images.unsplash.com/photo-1556306535-38febf6782e7?w=400",
          all_star_rank: 92,
          roas: 4.5,
          ctr_percent: 4.1,
          cpc: 0.38
        },
        {
          ad_name: "Product Benefits Highlight",
          image_url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400",
          creative_type: "IMAGE",
          all_star_rank: 87,
          roas: 4.2,
          ctr_percent: 3.8,
          cpc: 0.42
        },
        {
          ad_name: "Free Shipping Promo",
          image_url: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
          creative_type: "IMAGE",
          all_star_rank: 85,
          roas: 4.0,
          ctr_percent: 3.6,
          cpc: 0.44
        }
      ],
      BOFU: [
        {
          ad_name: "Limited Time 20% Off",
          image_url: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400",
          creative_type: "IMAGE",
          all_star_rank: 96,
          roas: 6.8,
          ctr_percent: 5.2,
          cpc: 0.32
        },
        {
          ad_name: "Last Chance Sale",
          image_url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400",
          creative_type: "IMAGE",
          all_star_rank: 94,
          roas: 6.2,
          ctr_percent: 4.9,
          cpc: 0.35
        },
        {
          ad_name: "Cart Abandonment Reminder",
          image_url: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
          creative_type: "IMAGE",
          all_star_rank: 91,
          roas: 5.8,
          ctr_percent: 4.5,
          cpc: 0.37
        }
      ]
    };

    // Create a mock message
    const mockMessage = {
      id: 'sample-report',
      role: 'assistant' as const,
      parts: [{
        type: 'text' as const,
        text: sampleReport
      }]
    };

    setMessages([mockMessage]);
    setFunnelAdsData(sampleAds);
    setSelectedTemplate(reportTemplates.find(t => t.id === 'hb-monthly-performance') || null);
  };


  const handleExportToGoogleDocs = async () => {
    try {
      setExportState('exporting');
      setExportMessage('');

      // Extract markdown content from assistant messages
      const reportContent = messages
        .filter(m => m.role === 'assistant')
        .map(m => m.parts?.filter(p => p.type === 'text').map(p => p.text).join('\n'))
        .join('\n\n');

      if (!reportContent) {
        console.error('No report content to export');
        setExportState('error');
        setExportMessage('No report content to export');
        setTimeout(() => setExportState('idle'), 3000);
        return;
      }

      console.log('[Reports Export] Exporting report to Google Docs...');

      const response = await fetch('/api/reports/export-google-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentClient,
          reportType: selectedTemplate?.id || 'custom',
          markdownContent: reportContent,
          funnelAds: funnelAdsData, // Include funnel ads data
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Reports Export] Success:', result.webViewLink);
        setExportState('success');
        setExportMessage('Exported successfully!');
        window.open(result.webViewLink, '_blank');
        setTimeout(() => setExportState('idle'), 3000);
      } else {
        console.error('[Reports Export] Failed:', result.error);
        setExportState('error');
        setExportMessage(result.error || 'Export failed');
        setTimeout(() => setExportState('idle'), 3000);
      }
    } catch (error) {
      console.error('[Reports Export] Error:', error);
      setExportState('error');
      setExportMessage('Failed to export report');
      setTimeout(() => setExportState('idle'), 3000);
    }
  };

  const handleExportToPDF = async () => {
    try {
      setPdfExportState('exporting');
      setPdfExportMessage('');

      // Get the report content div
      const reportContentDiv = document.querySelector('.report-content');
      if (!reportContentDiv) {
        console.error('No report content found');
        setPdfExportState('error');
        setPdfExportMessage('No report content to export');
        setTimeout(() => setPdfExportState('idle'), 3000);
        return;
      }

      console.log('[PDF Export] Capturing styles and generating PDF...');

      // Function to get all computed styles for an element
      const getComputedStylesAsString = (element: Element): string => {
        const styles = window.getComputedStyle(element);
        let cssText = '';
        for (let i = 0; i < styles.length; i++) {
          const prop = styles[i];
          cssText += `${prop}: ${styles.getPropertyValue(prop)}; `;
        }
        return cssText;
      };

      // Clone the report content
      const clonedContent = reportContentDiv.cloneNode(true) as HTMLElement;

      // Apply inline styles to all elements to preserve the exact look
      const applyInlineStyles = (element: Element) => {
        if (element instanceof HTMLElement) {
          const computedStyles = getComputedStylesAsString(element);
          element.setAttribute('style', computedStyles);
        }

        // Recursively apply to children
        Array.from(element.children).forEach(child => applyInlineStyles(child));
      };

      applyInlineStyles(clonedContent);

      // Get the full HTML with inlined styles
      const styledHtml = clonedContent.outerHTML;

      // Send the HTML content with inlined styles to the backend
      const response = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: styledHtml,
          clientId: currentClient,
          reportType: selectedTemplate?.id || 'custom',
          useInlineStyles: true,
        })
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${currentClient}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('[PDF Export] Success');
        setPdfExportState('success');
        setPdfExportMessage('PDF downloaded!');
        setTimeout(() => setPdfExportState('idle'), 3000);
      } else {
        const result = await response.json();
        console.error('[PDF Export] Failed:', result.error);
        setPdfExportState('error');
        setPdfExportMessage(result.error || 'Export failed');
        setTimeout(() => setPdfExportState('idle'), 3000);
      }
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      setPdfExportState('error');
      setPdfExportMessage('Failed to generate PDF');
      setTimeout(() => setPdfExportState('idle'), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      // If a template is selected, pre-fetch data first
      if (selectedTemplate) {
        try {
          setIsPrefetching(true);
          console.log('[Reports] Pre-fetching data for:', selectedTemplate.id);

          // Use 'previous-month' period for H&B monthly report, '30d' for others
          const period = selectedTemplate.id === 'hb-monthly-performance' ? 'previous-month' : '30d';

          const dataResponse = await fetch('/api/reports/fetch-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reportType: selectedTemplate.id,
              clientId: currentClient,
              period
            })
          });

          const { data, formattedData, dateRange } = await dataResponse.json();
          console.log('[Reports] Pre-fetched data:', Object.keys(data));

          // Store funnel ads data for client-side injection
          if (data.funnelAds) {
            console.log('[Reports] Storing funnel ads data for injection');
            setFunnelAdsData(data.funnelAds);
          }

          setIsPrefetching(false);

          // Construct enhanced prompt with formatted markdown data (more token-efficient)
          const enhancedPrompt = `${input}\n\n${formattedData}\n\n**IMPORTANT INSTRUCTIONS:**\n- Use ONLY the data provided above\n- The data is synced nightly, so today's date is excluded (data is through yesterday)\n- Generate the report directly from this pre-fetched data`;

          console.log('========== FULL PROMPT SENT TO CLAUDE ==========');
          console.log(enhancedPrompt);
          console.log('========== END OF PROMPT ==========');

          sendMessage(
            { text: enhancedPrompt },
            {
              body: {
                selectedClient: currentClient,
                expectsReport: true,
                hasPrefetchedData: true, // Tell API to disable BigQuery tools
              },
            }
          );
        } catch (error) {
          console.error('[Reports] Data fetch error:', error);
          setIsPrefetching(false);
          // Fall back to normal flow without pre-fetched data
          sendMessage(
            { text: input },
            {
              body: {
                selectedClient: currentClient,
                expectsReport: true,
              },
            }
          );
        }
      } else {
        // No template, send normally
        sendMessage(
          { text: input },
          {
            body: {
              selectedClient: currentClient,
              expectsReport: true,
            },
          }
        );
      }
      setInput('');
    }
  };

  return (
    <div className="reports-page flex h-screen overflow-hidden p-6 gap-6">
      {/* Report Templates Sidebar - Card Style */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        <div className="card h-full flex flex-col p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Report Templates
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Select a template to generate a report
            </p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {availableTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]'
                    : 'border-[var(--border-muted)] hover:border-[var(--border-subtle)]'
                }`}
                style={{
                  background: selectedTemplate?.id === template.id ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                }}
                disabled={isProcessing}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {template.title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {template.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-lg border transition-all"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-muted)',
          left: sidebarOpen ? 'calc(20rem + 1.5rem)' : '1.5rem',
        }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        )}
      </button>

      {/* Main Content Area - Generator + Report View */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Report Generator Section - 25% */}
        <div className="w-1/4 flex flex-col">
          <div className="card h-full flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
            {/* Header */}
            <div className="border-b p-4" style={{ borderColor: 'var(--border-muted)', background: 'transparent' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Generator
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {getClientDisplayName(currentClient)}
              </p>
            </div>

            {/* Content Area - Messages or Input Prompt */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <div className="text-center mb-6">
                    <FileText className="w-12 h-12 mb-3 mx-auto" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      No messages yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Select a template to begin
                    </p>
                  </div>

                  {/* Input in center when no messages */}
                  <div className="w-full max-w-md">
                    {selectedTemplate && (
                      <div className="mb-3 p-2 rounded-lg border" style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent-border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedTemplate.icon}</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                            {selectedTemplate.title}
                          </span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSubmit}>
                      <Input
                        placeholder="Refine or generate..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={status !== 'ready' || isPrefetching}
                        className="mb-2 p-2 text-sm"
                        style={{
                          background: 'var(--bg-elevated)',
                          borderColor: 'var(--border-muted)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={status !== 'ready' || !input.trim() || isPrefetching}
                          className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-[#89cdee] hover:bg-[#7bb8e1]"
                        >
                          {isPrefetching ? (
                            <Loader2 className="text-white w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowUpFromDot className="text-white w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages when there are messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message, index) => {
                      const isLastAssistant = index === messages.length - 1 && message.role === 'assistant';

                      if (message.role === 'tool') return null;

                      return (
                        <div
                          key={message.id}
                          className="rounded-lg p-3"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          {message.role === 'user' && (
                            <div className="flex items-start gap-2 mb-2">
                              <Avatar className="w-6 h-6 bg-white">
                                <AvatarImage src="/compass_icon.svg" alt="Avatar" />
                                <AvatarFallback>RS</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>You</span>
                            </div>
                          )}
                          <div className="prose prose-sm">
                            {message.parts?.map((part, partIndex) => {
                              if (part.type === 'text') {
                                return (
                                  <div key={partIndex} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {part.text.substring(0, 150)}
                                    {part.text.length > 150 && '...'}
                                  </div>
                                );
                              }
                              if (part.type === 'tool-call') {
                                return (
                                  <div key={partIndex} className="text-xs my-1" style={{ color: 'var(--text-muted)' }}>
                                    <Cog className="w-3 h-3 inline mr-1" />
                                    {part.toolName}
                                  </div>
                                );
                              }
                              return null;
                            })}
                            {isLastAssistant && isGenerating && (
                              <div className="flex items-center gap-2 mt-2">
                                <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generating...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Area at bottom when there are messages */}
                  <div className="border-t p-4" style={{ borderColor: 'var(--border-muted)' }}>
                    {selectedTemplate && (
                      <div className="mb-3 p-2 rounded-lg border" style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent-border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedTemplate.icon}</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                            {selectedTemplate.title}
                          </span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSubmit}>
                      <Input
                        placeholder="Refine or generate..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={status !== 'ready' || isPrefetching}
                        className="mb-2 p-2 text-sm"
                        style={{
                          background: 'var(--bg-elevated)',
                          borderColor: 'var(--border-muted)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={status !== 'ready' || !input.trim() || isPrefetching}
                          className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-[#89cdee] hover:bg-[#7bb8e1]"
                        >
                          {isPrefetching ? (
                            <Loader2 className="text-white w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowUpFromDot className="text-white w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Report View Section - 75% */}
        <div className="flex-1 flex flex-col">
          <div className="card h-full flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
            {/* Report Header */}
            <div className="border-b p-4" style={{ borderColor: 'var(--border-muted)', background: 'transparent' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Report Preview
                  </h2>
                  {messages.length === 0 && (
                    <Button
                      onClick={loadSampleReport}
                      className="flex items-center gap-2 text-xs px-3 py-1 btn-secondary"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <FileText className="w-3 h-3" />
                      Load Sample
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* PDF Export Button */}
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={handleExportToPDF}
                      className={`flex items-center gap-2 text-sm px-3 py-2 ${
                        pdfExportState === 'success' ? 'btn-primary' :
                        pdfExportState === 'error' ? 'bg-[#b55c5c] text-white border-[#b55c5c]' :
                        'btn-secondary'
                      }`}
                      disabled={messages.length === 0 || pdfExportState === 'exporting'}
                    >
                      {pdfExportState === 'exporting' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {pdfExportState === 'success' && <CheckCircle className="w-4 h-4" />}
                      {pdfExportState === 'error' && <X className="w-4 h-4" />}
                      {pdfExportState === 'idle' && <FileDown className="w-4 h-4" />}
                      {pdfExportState === 'exporting' ? 'Generating...' :
                       pdfExportState === 'success' ? 'Downloaded!' :
                       pdfExportState === 'error' ? 'Failed' :
                       'PDF'}
                    </Button>
                    {pdfExportMessage && (
                      <p className="text-xs" style={{
                        color: pdfExportState === 'success' ? 'var(--accent-primary)' :
                               pdfExportState === 'error' ? '#b55c5c' :
                               'var(--text-muted)'
                      }}>
                        {pdfExportMessage}
                      </p>
                    )}
                  </div>

                  {/* Google Docs Export Button */}
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={handleExportToGoogleDocs}
                      className={`flex items-center gap-2 text-sm px-3 py-2 ${
                        exportState === 'success' ? 'btn-primary' :
                        exportState === 'error' ? 'bg-[#b55c5c] text-white border-[#b55c5c]' :
                        'btn-secondary'
                      }`}
                      disabled={messages.length === 0 || exportState === 'exporting'}
                    >
                      {exportState === 'exporting' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {exportState === 'success' && <CheckCircle className="w-4 h-4" />}
                      {exportState === 'error' && <X className="w-4 h-4" />}
                      {exportState === 'idle' && <Download className="w-4 h-4" />}
                      {exportState === 'exporting' ? 'Exporting...' :
                       exportState === 'success' ? 'Exported!' :
                       exportState === 'error' ? 'Failed' :
                       'Google Docs'}
                    </Button>
                    {exportMessage && (
                      <p className="text-xs" style={{
                        color: exportState === 'success' ? 'var(--accent-primary)' :
                               exportState === 'error' ? '#b55c5c' :
                               'var(--text-muted)'
                      }}>
                        {exportMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-8" style={{ background: 'transparent' }}>
              {isPrefetching ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Pre-fetching data...
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                      Gathering metrics from BigQuery
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Report will appear here
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                      Generate a report to see the preview
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none report-content">
                  <style jsx>{`
                    .report-content :global(h2) {
                      font-weight: 800;
                      margin-top: 1.24rem;
                    }
                  `}</style>
                  {messages.map((message) => {
                    if (message.role === 'assistant') {
                      return message.parts?.map((part, partIndex) => {
                        if (part.type === 'text') {
                          return (
                            <MemoizedMarkdown
                              key={`${message.id}-${partIndex}`}
                              id={`artifact-${message.id}-${partIndex}`}
                              content={part.text}
                            />
                          );
                        }
                        return null;
                      });
                    }
                    return null;
                  })}

                  {/* Inject funnel ads section after Claude's report (only for H&B monthly performance) */}
                  {selectedTemplate?.id === 'hb-monthly-performance' && funnelAdsData && !isGenerating && (
                    <FunnelAdsSection funnelAds={funnelAdsData} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
