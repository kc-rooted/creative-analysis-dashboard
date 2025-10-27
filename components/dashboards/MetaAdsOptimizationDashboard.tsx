'use client';

import { useState } from 'react';
import AdSetCard from './widgets/AdSetCard';
import { MOCK_AD_SETS, getAllCampaigns, getAdSetsByCampaign } from '@/lib/mock-data/meta-ads-optimization';

export default function MetaAdsOptimizationDashboard() {
  const campaigns = getAllCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState<string>(campaigns[0]);
  const [viewMode, setViewMode] = useState<'portfolio' | 'all'>('portfolio');

  const displayedAdSets = viewMode === 'portfolio'
    ? getAdSetsByCampaign(selectedCampaign)
    : MOCK_AD_SETS;

  // Group ad sets by role for portfolio view
  const champion = displayedAdSets.find(ad => ad.role_label === 'Champion');
  const backup = displayedAdSets.find(ad => ad.role_label === 'Backup');
  const testing = displayedAdSets.find(ad => ad.role_label === 'Testing');

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Meta Ads Optimization
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            ABO Portfolio Testing Framework with Bayesian Analysis
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('portfolio')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'portfolio' ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              Portfolio View
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'all' ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              All Ad Sets
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Selector (only in portfolio view) */}
      {viewMode === 'portfolio' && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Campaign:
            </label>
            <div className="flex gap-2">
              {campaigns.map(campaign => (
                <button
                  key={campaign}
                  onClick={() => setSelectedCampaign(campaign)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    selectedCampaign === campaign
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  {campaign}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Summary (only in portfolio view) */}
      {viewMode === 'portfolio' && (
        <div className="grid grid-cols-4 gap-4">
          {/* Campaign Metrics */}
          <div className="card p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Total Spend (14D)
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${displayedAdSets.reduce((sum, ad) => sum + ad.spend_14d, 0).toFixed(0)}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Total Revenue (14D)
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${displayedAdSets.reduce((sum, ad) => sum + ad.revenue_14d, 0).toFixed(0)}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Blended ROAS (14D)
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {(displayedAdSets.reduce((sum, ad) => sum + ad.revenue_14d, 0) /
                displayedAdSets.reduce((sum, ad) => sum + ad.spend_14d, 0)).toFixed(2)}x
            </div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Total Purchases (14D)
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {displayedAdSets.reduce((sum, ad) => sum + ad.purchases_14d, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Ad Set Cards */}
      {viewMode === 'portfolio' ? (
        <div className="space-y-6">
          {/* Champion Slot */}
          {champion && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Champion Slot
                </h2>
                <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700' }}>
                  Primary Budget Allocation
                </div>
              </div>
              <AdSetCard data={champion} />
            </div>
          )}

          {/* Backup Slot */}
          {backup && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Backup Slot
                </h2>
                <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(192, 192, 192, 0.1)', color: '#C0C0C0' }}>
                  Safety Net
                </div>
              </div>
              <AdSetCard data={backup} />
            </div>
          )}

          {/* Testing Slot */}
          {testing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Testing Slot
                </h2>
                <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  Discovery Mode
                </div>
              </div>
              <AdSetCard data={testing} />
            </div>
          )}
        </div>
      ) : (
        /* All Ad Sets Grid View */
        <div className="grid grid-cols-1 gap-6">
          {displayedAdSets.map(adSet => (
            <AdSetCard key={adSet.adset_name} data={adSet} />
          ))}
        </div>
      )}

      {/* Mock Data Notice */}
      <div className="card p-4" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Using Mock Data
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This dashboard is currently displaying mock data. Once the BigQuery views (<code>abo_portfolio_performance</code> and <code>abo_bayesian_posteriors</code>) are populated, real-time data will be shown here.
              <br /><br />
              The Bayesian calculator service is ready to run. Execute: <code>docker-compose --profile tools run --rm bayesian-calculator</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
