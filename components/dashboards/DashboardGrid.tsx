'use client';

import { useState, useEffect } from 'react';
import { DateRange } from '@/types/dashboard';
import KPICard from './widgets/KPICard';
import ChartCard from './widgets/ChartCard';
import { Loader2, FrownIcon } from 'lucide-react';

interface DashboardGridProps {
  section: string;
  dateRange: DateRange;
}

interface DashboardData {
  kpis: {
    totalRevenue: any;
    blendedROAS: any;
    emailPerformance: any;
    customerLTV: any;
    productHealth: any;
  };
  charts: {
    revenueTrend: any[];
    channelPerformance: any[];
    paidMediaTrend: any[];
  };
}

export default function DashboardGrid({ section, dateRange }: DashboardGridProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailData, setEmailData] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch dashboard data on mount only
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching dashboard data...');

        const response = await fetch('/api/dashboard');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to fetch dashboard data');
        }
        const data = await response.json();
        console.log('Dashboard data received:', data);

        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // Only fetch once on mount

  // Fetch email data when on email section
  useEffect(() => {
    if (section !== 'email') return;

    const fetchEmailData = async () => {
      try {
        setEmailLoading(true);
        setEmailError(null);
        const response = await fetch('/api/email');
        if (!response.ok) {
          throw new Error('Failed to fetch email data');
        }
        const data = await response.json();
        setEmailData(data);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setEmailLoading(false);
      }
    };
    fetchEmailData();
  }, [section]);

  // Only show Big 5 KPIs for Business Overview section
  if (section === 'overview') {
    // Show loading state
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading dashboard data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Show dashboard with real data
    if (!dashboardData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        {/* Big 5 KPIs - Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
          {/* Total Revenue */}
          <KPICard
            title="TOTAL REVENUE"
            currentValue={`$${(dashboardData.kpis.totalRevenue.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.totalRevenue.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.totalRevenue.periodData?.sevenDay?.value || 82000) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.totalRevenue.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.totalRevenue.periodData?.thirtyDay?.value || 295000) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.totalRevenue.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.totalRevenue.gaugeValue}
            gaugeMax={dashboardData.kpis.totalRevenue.gaugeMax}
            gaugeTarget={dashboardData.kpis.totalRevenue.gaugeTarget}
            gaugeLabel={`${(dashboardData.kpis.totalRevenue.gaugeValue / 1000).toFixed(1)}K / ${(dashboardData.kpis.totalRevenue.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Blended ROAS */}
          <KPICard
            title="BLENDED ROAS"
            currentValue={`${dashboardData.kpis.blendedROAS.current.toFixed(2)}x`}
            previousValue={undefined}
            trend={dashboardData.kpis.blendedROAS.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `${(dashboardData.kpis.blendedROAS.periodData?.sevenDay?.value || 5.59).toFixed(2)}x`,
                trend: dashboardData.kpis.blendedROAS.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `${(dashboardData.kpis.blendedROAS.periodData?.thirtyDay?.value || 6.50).toFixed(2)}x`,
                trend: dashboardData.kpis.blendedROAS.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.blendedROAS.gaugeValue}
            gaugeMax={dashboardData.kpis.blendedROAS.gaugeMax}
            gaugeTarget={dashboardData.kpis.blendedROAS.gaugeTarget}
            gaugeLabel={`${dashboardData.kpis.blendedROAS.gaugeValue.toFixed(2)}x / ${dashboardData.kpis.blendedROAS.gaugeTarget.toFixed(1)}x Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Paid Media Spend */}
          <KPICard
            title="PAID MEDIA SPEND"
            currentValue={`$${(dashboardData.kpis.paidMediaSpend.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.paidMediaSpend.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.paidMediaSpend.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.paidMediaSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.paidMediaSpend.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.paidMediaSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.paidMediaSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.paidMediaSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.paidMediaSpend.gaugeTarget}
            gaugeLabel={`${(dashboardData.kpis.paidMediaSpend.gaugeValue / 1000).toFixed(1)}K / ${(dashboardData.kpis.paidMediaSpend.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Email Revenue */}
          <KPICard
            title="EMAIL REVENUE"
            currentValue={`$${(dashboardData.kpis.emailPerformance.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.emailPerformance.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.emailPerformance.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.emailPerformance.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.emailPerformance.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.emailPerformance.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.emailPerformance.gaugeValue}
            gaugeMin={dashboardData.kpis.emailPerformance.gaugeMin}
            gaugeMax={dashboardData.kpis.emailPerformance.gaugeMax}
            gaugeTarget={dashboardData.kpis.emailPerformance.gaugeTarget}
            gaugeLabel={`${dashboardData.kpis.emailPerformance.gaugeMin}% - ${dashboardData.kpis.emailPerformance.gaugeMax}% of Total Revenue`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* 7-Day Revenue Forecast */}
          <div className="card p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                  7-DAY FORECAST
                </h3>
              </div>

              {/* Main Forecast Value */}
              <div className="space-y-3">
                <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                  ${(dashboardData.kpis.revenueForecast.totalForecasted / 1000).toFixed(1)}K
                </div>

                {/* Range */}
                <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Range: ${(dashboardData.kpis.revenueForecast.lowerBound / 1000).toFixed(1)}K - ${(dashboardData.kpis.revenueForecast.upperBound / 1000).toFixed(1)}K
                </div>

                {/* Suggested Spend */}
                <div className="flex items-center justify-between text-sm">
                  <span style={{color: 'var(--text-muted)'}}>Suggested Spend:</span>
                  <span className="font-semibold" style={{color: 'var(--text-primary)'}}>
                    ${(dashboardData.kpis.revenueForecast.suggestedSpend / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>

              {/* Visual Bar for Range */}
              <div className="space-y-2">
                <div className="relative h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                  {/* Lower to Upper Range */}
                  <div
                    className="absolute h-3 rounded-full"
                    style={{
                      left: `${(dashboardData.kpis.revenueForecast.lowerBound / dashboardData.kpis.revenueForecast.upperBound) * 100}%`,
                      width: `${((dashboardData.kpis.revenueForecast.upperBound - dashboardData.kpis.revenueForecast.lowerBound) / dashboardData.kpis.revenueForecast.upperBound) * 100}%`,
                      background: 'rgba(137, 205, 238, 0.3)'
                    }}
                  />
                  {/* Forecasted Point */}
                  <div
                    className="absolute top-0 w-1 h-3 rounded-full"
                    style={{
                      left: `${(dashboardData.kpis.revenueForecast.totalForecasted / dashboardData.kpis.revenueForecast.upperBound) * 100}%`,
                      background: 'var(--accent-primary)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
                  <span>Low</span>
                  <span>Forecast</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Charts */}
        <div className="space-y-6">
          {/* Revenue Charts - Two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Paid Media Trend"
              type="line"
              dateRange={dateRange}
              data={dashboardData.charts.paidMediaTrend}
            />
            <ChartCard
              title="Shopify Revenue - Current Year vs Last Year"
              type="line"
              dateRange={dateRange}
              data={dashboardData.charts.shopifyRevenueYoY}
            />
          </div>
        </div>

        {/* Platform Performance - 6 Cards in One Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Google Spend */}
          <KPICard
            title="GOOGLE SPEND"
            currentValue={`$${(dashboardData.kpis.googleSpend.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.googleSpend.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.googleSpend.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.googleSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.googleSpend.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.googleSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.googleSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.googleSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.googleSpend.gaugeTarget}
            gaugeLabel={`$${(dashboardData.kpis.googleSpend.gaugeValue / 1000).toFixed(1)}K / $${(dashboardData.kpis.googleSpend.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Google Revenue */}
          <KPICard
            title="GOOGLE REVENUE"
            currentValue={`$${(dashboardData.kpis.googleRevenue.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.googleRevenue.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.googleRevenue.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.googleRevenue.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.googleRevenue.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.googleRevenue.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.googleRevenue.gaugeValue}
            gaugeMax={dashboardData.kpis.googleRevenue.gaugeMax}
            gaugeTarget={dashboardData.kpis.googleRevenue.gaugeTarget}
            gaugeLabel={`$${(dashboardData.kpis.googleRevenue.gaugeValue / 1000).toFixed(1)}K / $${(dashboardData.kpis.googleRevenue.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Google ROAS */}
          <KPICard
            title="GOOGLE ROAS"
            currentValue={`${dashboardData.kpis.googleROAS.current.toFixed(2)}x`}
            previousValue={undefined}
            trend={dashboardData.kpis.googleROAS.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `${(dashboardData.kpis.googleROAS.periodData?.sevenDay?.value || 0).toFixed(2)}x`,
                trend: dashboardData.kpis.googleROAS.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `${(dashboardData.kpis.googleROAS.periodData?.thirtyDay?.value || 0).toFixed(2)}x`,
                trend: dashboardData.kpis.googleROAS.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.googleROAS.gaugeValue}
            gaugeMax={dashboardData.kpis.googleROAS.gaugeMax}
            gaugeTarget={dashboardData.kpis.googleROAS.gaugeTarget}
            gaugeLabel={`${dashboardData.kpis.googleROAS.gaugeValue.toFixed(2)}x / ${dashboardData.kpis.googleROAS.gaugeTarget.toFixed(1)}x Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Meta Spend */}
          <KPICard
            title="META SPEND"
            currentValue={`$${(dashboardData.kpis.metaSpend.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.metaSpend.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.metaSpend.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.metaSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.metaSpend.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.metaSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.metaSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.metaSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.metaSpend.gaugeTarget}
            gaugeLabel={`$${(dashboardData.kpis.metaSpend.gaugeValue / 1000).toFixed(1)}K / $${(dashboardData.kpis.metaSpend.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Meta Revenue */}
          <KPICard
            title="META REVENUE"
            currentValue={`$${(dashboardData.kpis.metaRevenue.current / 1000).toFixed(1)}K`}
            previousValue={undefined}
            trend={dashboardData.kpis.metaRevenue.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `$${((dashboardData.kpis.metaRevenue.periodData?.sevenDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.metaRevenue.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `$${((dashboardData.kpis.metaRevenue.periodData?.thirtyDay?.value || 0) / 1000).toFixed(1)}K`,
                trend: dashboardData.kpis.metaRevenue.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.metaRevenue.gaugeValue}
            gaugeMax={dashboardData.kpis.metaRevenue.gaugeMax}
            gaugeTarget={dashboardData.kpis.metaRevenue.gaugeTarget}
            gaugeLabel={`$${(dashboardData.kpis.metaRevenue.gaugeValue / 1000).toFixed(1)}K / $${(dashboardData.kpis.metaRevenue.gaugeTarget / 1000).toFixed(0)}K Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Meta ROAS */}
          <KPICard
            title="META ROAS"
            currentValue={`${dashboardData.kpis.metaROAS.current.toFixed(2)}x`}
            previousValue={undefined}
            trend={dashboardData.kpis.metaROAS.periodData?.monthToDate?.trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: `${(dashboardData.kpis.metaROAS.periodData?.sevenDay?.value || 0).toFixed(2)}x`,
                trend: dashboardData.kpis.metaROAS.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: `${(dashboardData.kpis.metaROAS.periodData?.thirtyDay?.value || 0).toFixed(2)}x`,
                trend: dashboardData.kpis.metaROAS.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.metaROAS.gaugeValue}
            gaugeMax={dashboardData.kpis.metaROAS.gaugeMax}
            gaugeTarget={dashboardData.kpis.metaROAS.gaugeTarget}
            gaugeLabel={`${dashboardData.kpis.metaROAS.gaugeValue.toFixed(2)}x / ${dashboardData.kpis.metaROAS.gaugeTarget.toFixed(1)}x Target`}
            status="excellent"
            dateRange={dateRange}
          />
        </div>
      </div>
    );
  }

  // Email & Retention section
  if (section === 'email') {
    // Show loading state
    if (emailLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading email data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (emailError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{emailError}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Show email dashboard with real data
    if (!emailData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Email KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>TOTAL EMAIL REVENUE</h3>
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              ${(emailData.kpis.totalEmailRevenue.current / 1000).toFixed(1)}K
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>Month to Date</div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>CAMPAIGN REVENUE</h3>
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              ${(emailData.kpis.campaignRevenue.current / 1000).toFixed(1)}K
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
              {((emailData.kpis.campaignRevenue.current / emailData.kpis.totalEmailRevenue.current) * 100).toFixed(0)}% of Total
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>FLOW REVENUE</h3>
            <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
              ${(emailData.kpis.flowRevenue.current / 1000).toFixed(1)}K
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
              {((emailData.kpis.flowRevenue.current / emailData.kpis.totalEmailRevenue.current) * 100).toFixed(0)}% of Total
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm" style={{color: 'var(--text-muted)'}}>Open Rate</div>
              <div className="text-2xl font-bold mt-1" style={{color: 'var(--text-primary)'}}>{emailData.metrics.openRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm" style={{color: 'var(--text-muted)'}}>Click Rate</div>
              <div className="text-2xl font-bold mt-1" style={{color: 'var(--text-primary)'}}>{emailData.metrics.clickRate.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm" style={{color: 'var(--text-muted)'}}>Bounce Rate</div>
              <div className="text-2xl font-bold mt-1" style={{color: 'var(--text-primary)'}}>{emailData.metrics.bounceRate.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm" style={{color: 'var(--text-muted)'}}>Unsub Rate</div>
              <div className="text-2xl font-bold mt-1" style={{color: 'var(--text-primary)'}}>{emailData.metrics.unsubscribeRate.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Recent Campaigns</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Campaign</th>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Send Date</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Sends</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Open %</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Click %</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>$/Send</th>
                </tr>
              </thead>
              <tbody>
                {emailData.tables.campaigns.map((campaign: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.campaignName}</td>
                    <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{campaign.sendDate}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.sends.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.openRate}%</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.clickRate}%</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${campaign.revenue.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${campaign.revenuePerSend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flows Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Email Flows</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Flow Name</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Sends</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Open %</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Click %</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>$/Send</th>
                </tr>
              </thead>
              <tbody>
                {emailData.tables.flows.map((flow: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.flowName}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.sends.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.openRate}%</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.clickRate}%</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${flow.revenue.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${flow.revenuePerSend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // For other sections, show simplified layout
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
          {section.charAt(0).toUpperCase() + section.slice(1)} Dashboard
        </h2>
        <p className="text-lg mt-2" style={{color: 'var(--text-muted)'}}>
          Section-specific analytics will be implemented here
        </p>
      </div>
    </div>
  );
}