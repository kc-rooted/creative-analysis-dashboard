'use client';

import React, { useState } from 'react';
import { MemoizedMarkdown } from '@/components/conversation/memoized-markdown';
import { KPICard, AdCreativeCard, ReportSection } from '../components/ReportSection';
import { Loader2 } from 'lucide-react';

interface HBMonthlyHybridReportProps {
  data: any;
  onGenerateAISection: (sectionPrompt: string) => Promise<string>;
}

export function HBMonthlyHybridReport({ data, onGenerateAISection }: HBMonthlyHybridReportProps) {
  const [aiSections, setAiSections] = useState<Record<string, string>>({});
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});

  const generateSection = async (sectionKey: string, prompt: string) => {
    setLoadingSections(prev => ({ ...prev, [sectionKey]: true }));
    try {
      const result = await onGenerateAISection(prompt);
      setAiSections(prev => ({ ...prev, [sectionKey]: result }));
    } finally {
      setLoadingSections(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  // Auto-generate executive summary on mount if we have data
  React.useEffect(() => {
    // Only auto-generate if we have actual business data
    const hasData = data.executiveSummary && data.executiveSummary.length > 0;

    if (!aiSections.executiveSummary && hasData) {
      console.log('[HB Hybrid Report] Auto-generating executive summary with data');
      generateSection(
        'executiveSummary',
        `Write a 2-paragraph executive summary for Holderness & Bourne's monthly marketing performance based on this data:

        Executive Summary: ${JSON.stringify(data.executiveSummary?.[0] || {})}
        Monthly Business: ${JSON.stringify(data.monthlyBusinessSummary?.[0] || {})}

        Focus on key business metrics, YoY growth, and notable trends.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.executiveSummary, data.monthlyBusinessSummary]);

  return (
    <div className="space-y-8">
      {/* SECTION 1: Executive Summary (AI-Generated) */}
      <ReportSection title="Executive Summary" type="ai-generated">
        {loadingSections.executiveSummary ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Generating summary...</span>
          </div>
        ) : aiSections.executiveSummary ? (
          <MemoizedMarkdown content={aiSections.executiveSummary} id="exec-summary" />
        ) : (
          <button
            onClick={() =>
              generateSection(
                'executiveSummary',
                `Write ONLY a 2-paragraph executive summary for Holderness & Bourne's monthly marketing performance.

                Do NOT include any introductory text, explanations, or meta-commentary.
                Do NOT add headers or subheaders.
                Start directly with the summary content.

                Focus on:
                - Revenue and order trends
                - Paid media performance
                - Key growth metrics and YoY comparisons

                Keep it concise and executive-level.`
              )
            }
            className="btn-primary text-sm"
          >
            Generate Executive Summary
          </button>
        )}
      </ReportSection>

      {/* SECTION 2: Business Performance (Static KPI Cards) */}
      <ReportSection title="Business Performance" type="static">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Revenue (MTD)"
            value={`$${data.executiveSummary?.[0]?.revenue_mtd?.toLocaleString() || 'N/A'}`}
            change={`${data.executiveSummary?.[0]?.revenue_mtd_yoy_growth_pct?.toFixed(1) || '0'}% YoY`}
            changeDirection={
              (data.executiveSummary?.[0]?.revenue_mtd_yoy_growth_pct || 0) > 0 ? 'up' : 'down'
            }
          />
          <KPICard
            title="Orders (MTD)"
            value={data.executiveSummary?.[0]?.orders_mtd?.toLocaleString() || 'N/A'}
            change={`${data.executiveSummary?.[0]?.orders_mtd_yoy_growth_pct?.toFixed(1) || '0'}% YoY`}
            changeDirection={
              (data.executiveSummary?.[0]?.orders_mtd_yoy_growth_pct || 0) > 0 ? 'up' : 'down'
            }
          />
          <KPICard
            title="AOV"
            value={`$${data.executiveSummary?.[0]?.aov_mtd?.toFixed(2) || 'N/A'}`}
          />
          <KPICard
            title="Blended ROAS"
            value={`${data.monthlyBusinessSummary?.[0]?.net_sales_roas?.toFixed(2) || 'N/A'}x`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KPICard
            title="Facebook Spend"
            value={`$${data.executiveSummary?.[0]?.facebook_spend_mtd?.toLocaleString() || 'N/A'}`}
          />
          <KPICard
            title="Facebook ROAS"
            value={`${data.executiveSummary?.[0]?.facebook_roas_mtd?.toFixed(2) || 'N/A'}x`}
          />
          <KPICard
            title="Google ROAS"
            value={`${data.executiveSummary?.[0]?.google_roas_mtd?.toFixed(2) || 'N/A'}x`}
          />
        </div>
      </ReportSection>

      {/* SECTION 3: Paid Media Performance (Hybrid - Cards + AI Analysis) */}
      <ReportSection title="Paid Media Performance" type="hybrid">
        {/* Static data visualization */}
        <div className="mb-6 p-4 card" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Platform Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Facebook:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                ${data.executiveSummary?.[0]?.facebook_spend_mtd?.toLocaleString()} →
                ${data.executiveSummary?.[0]?.facebook_revenue_mtd?.toLocaleString()}
                ({data.executiveSummary?.[0]?.facebook_roas_mtd?.toFixed(2)}x ROAS)
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Google:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                ${data.executiveSummary?.[0]?.google_spend_mtd?.toLocaleString()} →
                ${data.executiveSummary?.[0]?.google_revenue_mtd?.toLocaleString()}
                ({data.executiveSummary?.[0]?.google_roas_mtd?.toFixed(2)}x ROAS)
              </span>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {!aiSections.paidMedia && (
          <button
            onClick={() =>
              generateSection(
                'paidMedia',
                `Provide 2-3 bullet points of key insights about the paid media performance shown above.

                Do NOT include headers, introductory text, or explanations about what you're doing.
                Start directly with the insights as bullet points.
                Keep it brief and actionable.`
              )
            }
            className="btn-secondary text-sm"
            disabled={loadingSections.paidMedia}
          >
            {loadingSections.paidMedia ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating analysis...
              </>
            ) : (
              'Generate AI Analysis'
            )}
          </button>
        )}
        {aiSections.paidMedia && (
          <MemoizedMarkdown content={aiSections.paidMedia} id="paid-media-analysis" />
        )}
      </ReportSection>

      {/* SECTION 4: Top Ads by Funnel Stage (Static - Ad Creative Cards) */}
      <ReportSection title="Top Ads by Funnel Stage" type="static">
        {/* TOFU */}
        {data.funnelAds?.TOFU && data.funnelAds.TOFU.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Top of Funnel (TOFU)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {data.funnelAds.TOFU.slice(0, 3).map((ad: any, index: number) => {
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
                      ctr: ad.ctr_percent,
                      cpc: ad.cpc,
                    }}
                  />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* MOFU */}
        {data.funnelAds?.MOFU && data.funnelAds.MOFU.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Middle of Funnel (MOFU)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {data.funnelAds.MOFU.slice(0, 3).map((ad: any, index: number) => {
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
                      cpc: ad.cpc,
                    }}
                  />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* BOFU */}
        {data.funnelAds?.BOFU && data.funnelAds.BOFU.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Bottom of Funnel (BOFU)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {data.funnelAds.BOFU.slice(0, 3).map((ad: any, index: number) => {
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
                      cpc: ad.cpc,
                    }}
                  />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* AI Insights for Funnel Ads */}
        {!aiSections.funnelInsights && (
          <button
            onClick={() =>
              generateSection(
                'funnelInsights',
                `Provide 1-2 sentences of insight for TOFU, MOFU, and BOFU ads shown above.

                Do NOT include headers or introductory text.
                Format as:
                - **TOFU:** [insight]
                - **MOFU:** [insight]
                - **BOFU:** [insight]

                Keep it brief and actionable.`
              )
            }
            className="btn-secondary text-sm"
            disabled={loadingSections.funnelInsights}
          >
            {loadingSections.funnelInsights ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating insights...
              </>
            ) : (
              'Generate Funnel Insights'
            )}
          </button>
        )}
        {aiSections.funnelInsights && (
          <div className="mt-4">
            <MemoizedMarkdown content={aiSections.funnelInsights} id="funnel-insights" />
          </div>
        )}
      </ReportSection>

      {/* SECTION 5: Strategic Recommendations (AI-Generated) */}
      <ReportSection title="Strategic Recommendations" type="ai-generated">
        {!aiSections.recommendations && (
          <button
            onClick={() =>
              generateSection(
                'recommendations',
                `Provide 3-5 strategic recommendations as a numbered list.

                Do NOT include headers, introductory text, or closing statements.
                Start directly with:
                1. [recommendation]
                2. [recommendation]
                etc.

                Focus on paid media optimization and actionable next steps.
                Keep each recommendation to 1-2 sentences.`
              )
            }
            className="btn-primary text-sm"
            disabled={loadingSections.recommendations}
          >
            {loadingSections.recommendations ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating recommendations...
              </>
            ) : (
              'Generate Recommendations'
            )}
          </button>
        )}
        {aiSections.recommendations && (
          <MemoizedMarkdown content={aiSections.recommendations} id="recommendations" />
        )}
      </ReportSection>
    </div>
  );
}
