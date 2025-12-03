'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Tag, TrendingUp, TrendingDown, Activity, Calendar, Play } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useClient } from '@/components/client-provider';

interface CreativeDetails {
  // CREATIVE IDENTIFICATION & METADATA
  content_id: string;
  representative_creative_id: string;
  representative_creative_name: string;
  cleaned_creative_name?: string;
  representative_ad_text?: string;
  primary_image_url: string;
  video_id?: string;

  // PLATFORM & USAGE DATA
  platforms_used: string[];
  total_usage_count: number;
  account_count: number;
  first_seen: string;
  last_seen: string;

  // PERFORMANCE METRICS
  total_spend: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  total_conversions: number | null;
  total_revenue: number | null;
  total_campaigns: number | null;

  // CALCULATED KPIs
  ctr_percent: number | null;
  cpm: number | null;
  cpc: number | null;
  conversion_rate_percent: number | null;
  roas: number | null;
  conversions_per_dollar: number | null;
  avg_spend_per_campaign: number | null;

  // PLATFORM BREAKDOWN
  facebook_campaigns: number | null;
  google_ads_campaigns: number | null;
  facebook_spend: number | null;
  google_ads_spend: number | null;
  facebook_impressions: number | null;
  google_ads_impressions: number | null;

  // PERFORMANCE ANALYSIS
  performance_tier: string;
  first_active_date: string;
  last_active_date: string;
  days_since_last_active: number;

  // FUNNEL ANALYSIS
  primary_funnel_stage?: string;
  tofu_campaigns?: number;
  mofu_campaigns?: number;
  bofu_campaigns?: number;
  tofu_spend?: number;
  mofu_spend?: number;
  bofu_spend?: number;

  // AI ANALYSIS FIELDS
  analysis_status: string;
  creative_tags: string[];
  themes: string[];
  sentiment?: string;
  target_audience?: string;
  visual_style?: string;
  product_focus?: string;
}

export default function CreativeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentClient } = useClient();
  const [creative, setCreative] = useState<CreativeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper function to parse color palette data
  const parseColorPalette = (colorPaletteDetailed: any) => {
    if (!colorPaletteDetailed) return null;
    if (Array.isArray(colorPaletteDetailed)) return colorPaletteDetailed;
    if (typeof colorPaletteDetailed === 'string') {
      try {
        const parsed = JSON.parse(colorPaletteDetailed);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const contentId = params?.contentId as string;

  useEffect(() => {
    if (contentId) {
      fetchCreativeDetails();
    }
  }, [contentId]);

  const fetchCreativeDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/creative/${encodeURIComponent(contentId)}`, {
        headers: { 'x-client-id': currentClient || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setCreative(data);
      } else {
        console.error('Failed to fetch creative details');
      }
    } catch (error) {
      console.error('Error fetching creative details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReAnalyze = async () => {
    if (!creative) return;
    
    try {
      setIsAnalyzing(true);
      
      // Update local state to show analyzing status
      setCreative(prev => prev ? { ...prev, analysis_status: 'analyzing' } : null);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': currentClient || '',
        },
        body: JSON.stringify({ contentIds: [creative.content_id] }),
      });
      
      if (response.ok) {
        // Refresh the creative details to get updated analysis
        setTimeout(() => {
          fetchCreativeDetails();
        }, 2000); // Give it a moment to process
      } else {
        const error = await response.json();
        console.error('Re-analysis failed:', error.message);
        // Revert status on error
        setCreative(prev => prev ? { ...prev, analysis_status: 'failed' } : null);
      }
    } catch (error) {
      console.error('Error triggering re-analysis:', error);
      setCreative(prev => prev ? { ...prev, analysis_status: 'failed' } : null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">

        <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center" style={{minHeight: 'calc(100vh - 200px)'}}>
            <div className="w-12 h-12 animate-logo-breathing">
              <svg viewBox="0 0 1000 1000" className="w-full h-full">
                <defs>
                  <style>
                    {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                  </style>
                </defs>
                <rect className="logo-bg" width="1000" height="1000"></rect>
                <g>
                  <g>
                    <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"></path>
                    <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"></path>
                  </g>
                  <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"></path>
                </g>
              </svg>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Creative Not Found</h1>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) {
      return '$0.00';
    }
    // Convert string to number if needed (BigQuery NUMERIC returns as string)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue);
  };

  const formatPercentage = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) {
      return '0.00%';
    }
    // Convert string to number if needed (BigQuery NUMERIC returns as string)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '0.00%';
    }
    // If value is greater than 100, it might be stored as basis points (divide by 100)
    const percentage = numValue > 100 ? numValue / 100 : numValue;
    return `${percentage.toFixed(2)}%`;
  };


  return (
    <div className="min-h-screen">

      {/* Page Title and Back Button */}
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-all duration-200" 
            style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)'}}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            <ArrowLeft className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
          </button>
          <h2 style={{color: 'var(--text-primary)'}}>Creative Details & Performance</h2>
        </div>
      </div>

      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image */}
          <div className="lg:col-span-1">
            <div className="card p-10">
              <h3 className="mb-4">
                {creative.video_id ? 'Creative Video' : 'Creative Image'}
              </h3>
              <div className="aspect-square rounded-lg overflow-hidden" style={{background: 'var(--bg-elevated)'}}>
                {creative.video_id ? (
                  // Try iframe embed, fallback to thumbnail
                  <div className="relative w-full h-full">
                    <iframe
                      src={`https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${creative.video_id}&show_text=false&width=560&height=560`}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      onError={() => {
                        console.log('Facebook iframe failed, showing thumbnail');
                        setVideoError(true);
                      }}
                    />
                    {videoError && (
                      <div className="absolute inset-0 bg-white">
                        {creative.thumbnail_url ? (
                          <>
                            <img
                              src={creative.thumbnail_url}
                              alt={creative.cleaned_creative_name || creative.representative_creative_name}
                              className="w-full h-full object-cover"
                              style={{borderRadius: '12px'}}
                              onError={() => setImageError(true)}
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="bg-black/70 rounded-full p-4">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded" style={{background: 'var(--accent-primary)', color: 'var(--bg-primary)'}}>
                              VIDEO
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full" style={{background: 'var(--bg-elevated)'}}>
                            <div className="text-center">
                              <Activity className="w-12 h-12 mx-auto mb-2" style={{color: 'var(--text-muted)'}} />
                              <p style={{color: 'var(--text-muted)'}}>Video not available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : !imageError && creative.primary_image_url ? (
                  // Image display
                  <img
                    src={creative.primary_image_url}
                    alt={creative.cleaned_creative_name || creative.representative_creative_name}
                    className="w-full h-full object-cover"
                    style={{borderRadius: '12px'}}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-2" style={{color: 'var(--text-muted)'}} />
                      <p style={{color: 'var(--text-muted)'}}>Media not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {(creative.primary_image_url || creative.video_id) && (
                <div className="mt-4 space-y-2">
                  {creative.primary_image_url && !creative.video_id && (
                    <a
                      href={creative.primary_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 transition-colors duration-200"
                      style={{color: 'var(--accent-primary)'}}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Full Size
                    </a>
                  )}
                  {creative.video_id && (
                    <p className="text-sm" style={{color: 'var(--text-muted)'}}>Video ID: {creative.video_id}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Details Section */}
            <div className="card p-10">
              <h3 className="mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
                Campaign Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Platforms Used</p>
                  <div className="flex gap-1 mt-1">
                    {creative.platforms_used?.map(platform => (
                      <span
                        key={platform}
                        className="tag tag-accent"
                      >
                        {platform === 'facebook' ? 'Meta' : 'Google Ads'}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Campaigns</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.total_campaigns)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Usage Count</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.total_usage_count)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Account Count</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.account_count)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>First Seen</p>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {creative.first_seen === 'N/A' ? 'N/A' : new Date(creative.first_seen).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Last Seen</p>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {creative.last_seen === 'N/A' ? 'N/A' : new Date(creative.last_seen).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {creative.representative_ad_text && (
                <div className="mt-4">
                  <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Ad Copy</p>
                  <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      {creative.representative_ad_text}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Facebook Campaigns</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.facebook_campaigns)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Google Ads Campaigns</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.google_ads_campaigns)}</p>
                </div>
              </div>
            </div>

            {/* Analysis Details Section */}
            <div className="card p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Tag className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
                  Analysis Details
                </h3>
                {!creative.video_id && (
                  <button
                    onClick={handleReAnalyze}
                    disabled={isAnalyzing}
                    className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor: 'var(--accent-primary)', borderTopColor: 'transparent'}}></div>
                        Re-analyzing...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Re-analyze
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{color: 'var(--text-muted)'}}>Status:</span>
                  <span className={`tag ${
                    creative.analysis_status === 'completed' ? 'tag-accent' : 'tag'
                  }`}>
                    {creative.analysis_status}
                  </span>
                </div>

                {creative.creative_tags && creative.creative_tags.length > 0 && (
                  <div>
                    <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Creative Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {creative.creative_tags.map(tag => (
                        <span
                          key={tag}
                          className="tag"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {creative.themes && creative.themes.length > 0 && (
                  <div>
                    <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Themes</p>
                    <div className="flex flex-wrap gap-1">
                      {creative.themes.map(theme => (
                        <span
                          key={theme}
                          className="tag tag-accent"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const colorPaletteDetailed = parseColorPalette(creative.color_palette_detailed);
                  return colorPaletteDetailed && colorPaletteDetailed.length > 0 ? (
                    <div>
                      <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Color Palette</p>
                      <div className="flex flex-wrap gap-3">
                        {colorPaletteDetailed.map((colorDetail, index) => (
                        <div key={index} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{background: 'var(--bg-elevated)'}}>
                          <div 
                            className="w-5 h-5 rounded flex-shrink-0" 
                            style={{ backgroundColor: colorDetail.hex_code, border: '1px solid var(--border-subtle)' }}
                            title={`${colorDetail.color_name} - ${colorDetail.hex_code}`}
                          />
                          <div className="text-xs">
                            <div className="font-medium" style={{color: 'var(--text-primary)'}}>{colorDetail.color_name}</div>
                            <div style={{color: 'var(--text-muted)'}}>{colorDetail.hex_code}</div>
                            {colorDetail.percentage && (
                              <div style={{color: 'var(--text-disabled)'}}>{colorDetail.percentage}%</div>
                            )}
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  ) : creative.color_palette && creative.color_palette.length > 0 ? (
                  <div>
                    <p className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Color Palette</p>
                    <div className="flex flex-wrap gap-2">
                      {creative.color_palette.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.startsWith('#') ? color : 'transparent', border: '1px solid var(--border-subtle)' }}
                            title={color}
                          />
                          <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {creative.sentiment && (
                    <div>
                      <p className="text-sm" style={{color: 'var(--text-muted)'}}>Sentiment</p>
                      <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{creative.sentiment}</p>
                    </div>
                  )}
                  {creative.target_audience && (
                    <div>
                      <p className="text-sm" style={{color: 'var(--text-muted)'}}>Target Audience</p>
                      <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{creative.target_audience}</p>
                    </div>
                  )}
                  {creative.visual_style && (
                    <div>
                      <p className="text-sm" style={{color: 'var(--text-muted)'}}>Visual Style</p>
                      <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{creative.visual_style}</p>
                    </div>
                  )}
                  {creative.product_focus && (
                    <div>
                      <p className="text-sm" style={{color: 'var(--text-muted)'}}>Product Focus</p>
                      <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{creative.product_focus}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Metrics Section */}
            <div className="card p-10">
              <h3 className="mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
                Performance Metrics
              </h3>
              
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{color: 'var(--text-muted)'}}>Performance Tier:</span>
                  <span className="tag tag-accent">
                    {creative.performance_tier || 'Not Available'}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Spend</p>
                  <p className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{formatCurrency(creative.total_spend)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Revenue</p>
                  <p className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{formatCurrency(creative.total_revenue)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>ROAS</p>
                  <p className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{creative.roas?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Conversions</p>
                  <p className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.total_conversions || 0)}</p>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Impressions</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.total_impressions || 0)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Clicks</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatNumber(creative.total_clicks || 0)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>CTR</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatPercentage(creative.ctr_percent)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>CPM</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(creative.cpm)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>CPC</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(creative.cpc)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Conversion Rate</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatPercentage(creative.conversion_rate_percent)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Conversions per $</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{creative.conversions_per_dollar?.toFixed(4) || '0.0000'}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Avg Spend per Campaign</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(creative.avg_spend_per_campaign)}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>Days Since Last Active</p>
                  <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{creative.days_since_last_active || 0}</p>
                </div>
              </div>

              {/* Platform Breakdown */}
              <div className="mt-6">
                <h4 className="mb-3">Platform Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg p-4" style={{border: '1px solid var(--border-muted)', background: 'var(--bg-elevated)'}}>
                    <h5 className="mb-2" style={{color: 'var(--accent-primary)'}}>Facebook</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Spend:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatCurrency(creative.facebook_spend)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Impressions:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.facebook_impressions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.facebook_campaigns || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{border: '1px solid var(--border-muted)', background: 'var(--bg-elevated)'}}>
                    <h5 className="mb-2" style={{color: 'var(--accent-primary)'}}>Google Ads</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Spend:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatCurrency(creative.google_ads_spend)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Impressions:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.google_ads_impressions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns:</span>
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.google_ads_campaigns || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Funnel Analysis Section */}
            <div className="card p-10">
              <h3 className="mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" style={{color: 'var(--accent-primary)'}} />
                Funnel Analysis
              </h3>
              
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{color: 'var(--text-muted)'}}>Primary Funnel Stage:</span>
                  <span className="tag tag-accent">
                    {creative.primary_funnel_stage || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)'}}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{background: 'var(--accent-primary)'}}></div>
                    <h5 style={{color: 'var(--text-primary)'}}>TOFU</h5>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.tofu_campaigns || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Spend:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatCurrency(creative.tofu_spend)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)'}}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{background: 'var(--accent-primary)'}}></div>
                    <h5 style={{color: 'var(--text-primary)'}}>MOFU</h5>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.mofu_campaigns || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Spend:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatCurrency(creative.mofu_spend)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)'}}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{background: 'var(--accent-primary)'}}></div>
                    <h5 style={{color: 'var(--text-primary)'}}>BOFU</h5>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Campaigns:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatNumber(creative.bofu_campaigns || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>Spend:</span>
                      <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>{formatCurrency(creative.bofu_spend)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}