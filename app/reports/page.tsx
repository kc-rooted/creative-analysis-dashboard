'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from "@/components/conversation/input"
import { Button } from "@/components/conversation/button"
import { ArrowUpFromDot, ChevronLeft, ChevronRight, FileText, Download, Loader2, CheckCircle, Cog, X, FileDown, Pencil } from "lucide-react"
import { MemoizedMarkdown } from '@/components/conversation/memoized-markdown';
import { useClient } from '@/components/client-provider';
import React, { useState, useEffect } from 'react';
import { AdCreativeCard } from '@/app/reports/components/ReportSection';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/conversation/avatar"

// Report template interface - matches BigQuery schema
interface ReportTemplate {
  id: string;
  client_id: string;
  template_id: string;
  title: string;
  description: string;
  category: string;
  prompt: string;
  period: string; // '30d', 'previous-month', '7d', etc.
  data_fetcher: string; // Which fetch function to use on the backend
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  modified_by?: string;
}

// Report templates are now loaded from BigQuery database
// API: /api/reports/templates

// Fetch templates from API
async function fetchTemplatesFromAPI(clientId: string): Promise<ReportTemplate[]> {
  try {
    const response = await fetch('/api/reports/templates', {
      headers: {
        'x-client-id': clientId,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('[Reports] Error fetching templates:', error);
    return [];
  }
}

// Save template to API
async function saveTemplateToAPI(
  templateId: string,
  prompt: string,
  modifiedBy: string = 'user'
): Promise<boolean> {
  try {
    const response = await fetch('/api/reports/templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        prompt,
        modified_by: modifiedBy,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Reports] Error saving template:', error);
    return false;
  }
}

// Report templates are now stored in BigQuery: admin_configs.report_templates
// Templates are loaded via /api/reports/templates API

// Prompt Editor Modal Component
function PromptEditorModal({
  template,
  isOpen,
  onClose,
  onSave,
  onReset,
}: {
  template: ReportTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateId: string, prompt: string) => void;
  onReset: (templateId: string) => void;
}) {
  const [editedPrompt, setEditedPrompt] = useState('');

  useEffect(() => {
    if (template && isOpen) {
      // Load the current prompt from the template (from DB)
      setEditedPrompt(template.prompt);
    }
  }, [template, isOpen]);

  if (!isOpen || !template) return null;

  const handleSave = () => {
    onSave(template.template_id, editedPrompt);
    onClose();
  };

  const handleReset = () => {
    // Reset just reloads from DB
    setEditedPrompt(template.prompt);
    onReset(template.template_id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-lg border overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-muted)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Edit Prompt: {template.title}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Changes will be saved to the database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full h-[60vh] p-4 rounded-lg border font-mono text-sm resize-none"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text-primary)',
            }}
            placeholder="Enter your custom prompt..."
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end p-4 border-t gap-3"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <Button
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="btn-primary text-sm"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
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
                // Use thumbnail_url for videos, image_url for images (with fallback)
                const imageUrl = ad.creative_type === 'VIDEO'
                  ? (ad.thumbnail_url || ad.image_url)
                  : (ad.image_url || ad.thumbnail_url);

                // Only render if we have an image URL
                if (!imageUrl) return null;

                return (
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const { currentClient, isLoading } = useClient();

  // Show loading state while client is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Show message if no client selected
  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111111]">
        <p className="text-gray-400">Please select a client from the dropdown above.</p>
      </div>
    );
  }

  // Render the actual reports page with a key to force re-mount on client change
  return <ReportsPageInner key={currentClient} currentClient={currentClient} />;
}

// Inner component that uses the chat hook - only rendered when currentClient is available
function ReportsPageInner({ currentClient }: { currentClient: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [input, setInput] = useState<string>('');
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState<string>('');
  const [pdfExportState, setPdfExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [pdfExportMessage, setPdfExportMessage] = useState<string>('');
  const [funnelAdsData, setFunnelAdsData] = useState<any>(null); // Store funnel ads for client-side injection
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesVersion, setTemplatesVersion] = useState(0); // Track template refreshes
  const [toneContext, setToneContext] = useState<string>(''); // Global tone context for all reports

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `reports-${currentClient}`,
    headers: {
      'x-client-id': currentClient,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Report generation finished:', message);
    },
  });

  // Fetch templates from API on mount and when client changes
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      console.log('[Reports] Fetching templates for client:', currentClient);
      const templates = await fetchTemplatesFromAPI(currentClient);
      console.log('[Reports] Fetched', templates.length, 'templates');
      setAvailableTemplates(templates);
      setIsLoadingTemplates(false);

      // Auto-select client-specific monthly performance template if available
      const clientSpecificTemplate = templates.find(
        t => t.template_id === `${currentClient}-monthly-performance`
      );

      if (clientSpecificTemplate) {
        console.log('[Reports] Auto-selecting client-specific template:', clientSpecificTemplate.template_id);
        setSelectedTemplate(clientSpecificTemplate);
        const processedPrompt = applyPromptReplacements(clientSpecificTemplate.prompt);
        setInput(processedPrompt);
      } else {
        setSelectedTemplate(null);
        setInput('');
      }
    }

    setMessages([]);
    loadTemplates();
  }, [currentClient, setMessages, templatesVersion]);

  // Fetch global tone context on mount
  useEffect(() => {
    async function loadToneContext() {
      try {
        const response = await fetch('/api/settings/global?key=tone_context');
        const data = await response.json();
        if (data.success && data.setting?.value) {
          console.log('[Reports] Loaded tone context');
          setToneContext(data.setting.value);
        }
      } catch (error) {
        console.error('[Reports] Error fetching tone context:', error);
      }
    }
    loadToneContext();
  }, []);

  // Re-apply prompt replacements when tone context is loaded (if a template is selected)
  useEffect(() => {
    if (toneContext && selectedTemplate && input.includes('{{tone}}')) {
      console.log('[Reports] Applying tone context to prompt');
      const processedPrompt = input.replace(/\{\{tone\}\}/g, toneContext);
      setInput(processedPrompt);
    }
  }, [toneContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const isGenerating = status === 'streaming' || status === 'submitted';
  const isProcessing = isGenerating || isPrefetching;

  // Helper to get display name for client
  const getClientDisplayName = (clientId: string | null) => {
    if (!clientId) return 'No Client Selected';
    const clientNames: Record<string, string> = {
      'jumbomax': 'JumboMax',
      'puttout': 'PuttOut',
      'hb': 'Holderness & Bourne',
      'benhogan': 'Ben Hogan Golf'
    };
    return clientNames[clientId] || clientId.toUpperCase();
  };

  // Helper to apply all prompt replacements (client name, tone context)
  const applyPromptReplacements = (prompt: string) => {
    let result = prompt
      .replace(/\{\{client\}\}/g, getClientDisplayName(currentClient))
      .replace(/\{\{tone\}\}/g, toneContext);
    return result;
  };

  const handleTemplateSelect = async (template: ReportTemplate) => {
    console.log('[Reports] Template selected:', template.template_id);
    setSelectedTemplate(template);
    // Use template prompt directly (DB is now source of truth)
    const processedPrompt = applyPromptReplacements(template.prompt);
    setInput(processedPrompt);
  };

  const handleEditPrompt = (template: ReportTemplate, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent template selection when clicking edit
    setEditingTemplate(template);
    setIsPromptEditorOpen(true);
  };

  const handleSavePrompt = async (templateId: string, prompt: string) => {
    setIsSavingTemplate(true);
    console.log('[Reports] Saving prompt for template:', templateId);

    const success = await saveTemplateToAPI(templateId, prompt, 'user');

    if (success) {
      // Refresh templates from API
      setTemplatesVersion(v => v + 1);
      // If this template is currently selected, update the input
      if (selectedTemplate?.template_id === templateId) {
        const processedPrompt = applyPromptReplacements(prompt);
        setInput(processedPrompt);
      }
      console.log('[Reports] Template saved successfully');
    } else {
      console.error('[Reports] Failed to save template');
    }

    setIsSavingTemplate(false);
  };

  const handleResetPrompt = (templateId: string) => {
    // With DB storage, reset refreshes from the database
    // The current DB value IS the "default" - there's no separate default vs custom
    console.log('[Reports] Reset requested for:', templateId, '- refreshing from database');
    setTemplatesVersion(v => v + 1);
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
    setSelectedTemplate(availableTemplates.find(t => t.template_id === 'hb-monthly-performance') || null);
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
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': currentClient || '',
        },
        body: JSON.stringify({
          clientId: currentClient,
          reportType: selectedTemplate?.template_id || 'custom',
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
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': currentClient || '',
        },
        body: JSON.stringify({
          htmlContent: styledHtml,
          clientId: currentClient,
          reportType: selectedTemplate?.template_id || 'custom',
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
      // Check if this is a refinement (messages already exist) vs. new generation
      const isRefinement = messages.length > 0;

      // If a template is selected AND this is the first generation (not a refinement)
      if (selectedTemplate && !isRefinement) {
        try {
          setIsPrefetching(true);
          console.log('[Reports] Pre-fetching data for initial generation:', selectedTemplate.template_id);

          // Use period and data_fetcher from template configuration (stored in BigQuery)
          // This eliminates hardcoded template-specific logic
          const period = selectedTemplate.period || '30d';
          const dataFetcher = selectedTemplate.data_fetcher || selectedTemplate.template_id;

          console.log('[Reports] Using template config - period:', period, 'data_fetcher:', dataFetcher);

          const dataResponse = await fetch('/api/reports/fetch-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': currentClient || '',
            },
            body: JSON.stringify({
              reportType: dataFetcher, // Use data_fetcher to determine which fetch function to use
              clientId: currentClient,
              period
            })
          });

          const { data, formattedData, dateRange, formattedContext } = await dataResponse.json();
          console.log('[Reports] Pre-fetched data:', Object.keys(data));
          console.log('[Reports] Business context included:', formattedContext ? 'Yes' : 'No');

          // Store funnel ads data for client-side injection
          if (data.funnelAds) {
            console.log('[Reports] Storing funnel ads data for injection');
            setFunnelAdsData(data.funnelAds);
          }

          setIsPrefetching(false);

          // Construct enhanced prompt with formatted markdown data and business context
          const contextSection = formattedContext ? `\n\n## BUSINESS CONTEXT\n${formattedContext}\n\n**IMPORTANT:** Use the business context above to:\n- Explain anomalies or significant YoY/MoM changes\n- Reference relevant promotions, product launches, or events when discussing performance\n- Provide context-aware insights that connect the data to known business activities\n` : '';

          const enhancedPrompt = `${input}\n\n${formattedData}${contextSection}\n\n**IMPORTANT INSTRUCTIONS:**\n- Use ONLY the data provided above\n- The data is synced nightly, so today's date is excluded (data is through yesterday)\n- Generate the report directly from this pre-fetched data\n- When explaining performance changes, reference relevant business context if available`;

          console.log('========== FULL PROMPT SENT TO CLAUDE ==========');
          console.log(enhancedPrompt);
          console.log('========== END OF PROMPT ==========');

          sendMessage(
            { text: enhancedPrompt },
            {
              headers: {
                'x-client-id': currentClient,
              },
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
              headers: {
                'x-client-id': currentClient,
              },
              body: {
                selectedClient: currentClient,
                expectsReport: true,
              },
            }
          );
        }
      } else if (isRefinement) {
        // This is a refinement - just send the message with existing context
        console.log('[Reports] Sending refinement request with existing context');

        // Note: We don't clear messages here because the AI needs the previous conversation
        // context to understand what to refine. The useChat hook will append the new response,
        // but we'll only show the latest assistant message in the UI.
        sendMessage(
          { text: input },
          {
            headers: {
              'x-client-id': currentClient,
            },
            body: {
              selectedClient: currentClient,
              expectsReport: true,
              hasPrefetchedData: true, // Data is already in context from previous messages
            },
          }
        );
      } else {
        // No template, send normally
        sendMessage(
          { text: input },
          {
            headers: {
              'x-client-id': currentClient,
            },
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
              <div
                key={template.template_id}
                className={`relative w-full text-left p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedTemplate?.template_id === template.template_id
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]'
                    : 'border-[var(--border-muted)] hover:border-[var(--border-subtle)]'
                }`}
                style={{
                  background: selectedTemplate?.template_id === template.template_id ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                  opacity: isProcessing ? 0.6 : 1,
                  pointerEvents: isProcessing ? 'none' : 'auto',
                }}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {template.title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {template.description}
                    </div>
                    {template.updated_at && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                        Last Edit: {new Date(template.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleEditPrompt(template, e)}
                    className="p-1.5 rounded hover:bg-[var(--bg-card)] transition-colors"
                    title="Edit prompt"
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
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
                          <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
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
                          <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
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
                  {(() => {
                    // Find the latest assistant message
                    const assistantMessages = messages.filter(m => m.role === 'assistant');
                    const latestAssistant = assistantMessages[assistantMessages.length - 1];

                    if (!latestAssistant) return null;

                    return latestAssistant.parts?.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return (
                          <MemoizedMarkdown
                            key={`${latestAssistant.id}-${partIndex}`}
                            id={`artifact-${latestAssistant.id}-${partIndex}`}
                            content={part.text}
                          />
                        );
                      }
                      return null;
                    });
                  })()}

                  {/* Funnel ads section removed - will be a separate report */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Editor Modal */}
      <PromptEditorModal
        template={editingTemplate}
        isOpen={isPromptEditorOpen}
        onClose={() => {
          setIsPromptEditorOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSavePrompt}
        onReset={handleResetPrompt}
      />
    </div>
  );
}
