'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from "@/components/conversation/input"
import { Button } from "@/components/conversation/button"
import { ArrowUpFromDot, ChevronLeft, ChevronRight, FileText, Download, Loader2, CheckCircle, Cog } from "lucide-react"
import { MemoizedMarkdown } from '@/components/conversation/memoized-markdown';
import { useClient } from '@/components/client-provider';
import React, { useState } from 'react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/conversation/avatar"

// Report templates
const reportTemplates = [
  {
    id: 'weekly-executive',
    title: 'Weekly Executive Summary',
    description: 'High-level overview of key metrics and trends',
    category: 'executive',
    icon: '📊',
    prompt: 'Generate a weekly executive summary report for {{client}} covering key performance metrics, trends, and notable insights from the past 7 days.'
  },
  {
    id: 'monthly-performance',
    title: 'Monthly Performance Review',
    description: 'Comprehensive monthly analysis',
    category: 'performance',
    icon: '📈',
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
    prompt: 'Provide a deep-dive analysis of {{platform}} performance for {{client}}, including ad-level insights, audience performance, and optimization recommendations.'
  },
  {
    id: 'email-retention',
    title: 'Email & Retention Report',
    description: 'Email marketing and customer retention metrics',
    category: 'marketing',
    icon: '📧',
    prompt: 'Generate an email marketing and customer retention report for {{client}}, covering campaign performance, subscriber engagement, and retention trends.'
  },
];

export default function ReportsPage() {
  const { currentClient } = useClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof reportTemplates[0] | null>(null);
  const [input, setInput] = useState<string>('');

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `reports-${currentClient}`,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Report generation finished:', message);
    },
  });

  // Reset messages when client changes
  React.useEffect(() => {
    console.log('Client changed to:', currentClient);
    setMessages([]);
    setSelectedTemplate(null);
  }, [currentClient, setMessages]);

  const isGenerating = status === 'streaming' || status === 'submitted';

  // Helper to get display name for client
  const getClientDisplayName = (clientId: string) => {
    const clientNames: Record<string, string> = {
      'jumbomax': 'JumboMax',
      'puttout': 'PuttOut',
      'hb': 'Holderness & Bourne'
    };
    return clientNames[clientId] || clientId.toUpperCase();
  };

  const handleTemplateSelect = async (template: typeof reportTemplates[0]) => {
    setSelectedTemplate(template);
    // Replace {{client}} placeholder with proper display name
    const promptWithClient = template.prompt.replace(/\{\{client\}\}/g, getClientDisplayName(currentClient));
    setInput(promptWithClient);
  };

  const handleExportToGoogleDocs = async () => {
    // TODO: Implement export functionality
    console.log('Export to Google Docs');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      // If a template is selected, pre-fetch data first
      if (selectedTemplate) {
        try {
          console.log('[Reports] Pre-fetching data for:', selectedTemplate.id);

          const dataResponse = await fetch('/api/reports/fetch-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reportType: selectedTemplate.id,
              clientId: currentClient,
              period: '30d'
            })
          });

          const { data, formattedData, dateRange } = await dataResponse.json();
          console.log('[Reports] Pre-fetched data:', Object.keys(data));

          // Construct enhanced prompt with formatted markdown data (more token-efficient)
          const enhancedPrompt = `${input}\n\n${formattedData}\n\n**IMPORTANT INSTRUCTIONS:**\n- Use ONLY the data provided above\n- The data is synced nightly, so today's date is excluded (data is through yesterday)\n- Generate the report directly from this pre-fetched data`;

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
            {reportTemplates.map((template) => (
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
                disabled={isGenerating}
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
                        disabled={status !== 'ready'}
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
                          disabled={status !== 'ready' || !input.trim()}
                          className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-[#89cdee] hover:bg-[#7bb8e1]"
                        >
                          <ArrowUpFromDot className="text-white w-4 h-4" />
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
                        disabled={status !== 'ready'}
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
                          disabled={status !== 'ready' || !input.trim()}
                          className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-[#89cdee] hover:bg-[#7bb8e1]"
                        >
                          <ArrowUpFromDot className="text-white w-4 h-4" />
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
            <div className="border-b p-4 flex items-center justify-between" style={{ borderColor: 'var(--border-muted)', background: 'transparent' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Report Preview
              </h2>
              <Button
                onClick={handleExportToGoogleDocs}
                className="btn-secondary flex items-center gap-2 text-sm px-3 py-2"
                disabled={messages.length === 0}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-8" style={{ background: 'transparent' }}>
              {messages.length === 0 ? (
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
                <div className="prose max-w-none" style={{ color: 'var(--text-primary)', background: 'transparent' }}>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
