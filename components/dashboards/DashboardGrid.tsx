'use client';

import { useState, useEffect } from 'react';
import { DateRange } from '@/types/dashboard';
import KPICard from './widgets/KPICard';
import ChartCard from './widgets/ChartCard';
import DateFilter, { DatePreset } from './widgets/DateFilter';
import ComparisonSelector, { ComparisonType } from './widgets/ComparisonSelector';
import USRevenueMap from './widgets/USRevenueMap';
import ProductBundleTable from './widgets/ProductBundleTable';
import ProductRankings from './widgets/ProductRankings';
import ProductAlsoBought from './widgets/ProductAlsoBought';
import GripSwitchingSankey from './widgets/GripSwitchingSankey';
import CustomerCLVDashboard from './widgets/CustomerCLVDashboard';
import PlatformPerformanceMatrix from './widgets/PlatformPerformanceMatrix';
import CampaignMarginalROAS from './widgets/CampaignMarginalROAS';
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
  const [emailDatePreset, setEmailDatePreset] = useState<DatePreset>('mtd');
  const [emailCustomDates, setEmailCustomDates] = useState<{ start?: string; end?: string }>({});
  const [emailComparisonType, setEmailComparisonType] = useState<ComparisonType>('previous-period');
  const [productData, setProductData] = useState<any>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [productPeriod, setProductPeriod] = useState<string>('30d');
  const [customerData, setCustomerData] = useState<any>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [platformData, setPlatformData] = useState<any>(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [platformPeriod, setPlatformPeriod] = useState<string>('30d');
  const [facebookData, setFacebookData] = useState<any>(null);
  const [facebookLoading, setFacebookLoading] = useState(true);
  const [facebookError, setFacebookError] = useState<string | null>(null);
  const [facebookDatePreset, setFacebookDatePreset] = useState<DatePreset>('mtd');
  const [facebookCustomDates, setFacebookCustomDates] = useState<{ start?: string; end?: string }>({});
  const [facebookComparisonType, setFacebookComparisonType] = useState<ComparisonType>('previous-period');

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

  // Fetch email data when on email section or when date filter changes
  useEffect(() => {
    if (section !== 'email') return;

    const fetchEmailData = async () => {
      try {
        setEmailLoading(true);
        setEmailError(null);

        // Build query params
        const params = new URLSearchParams({
          preset: emailDatePreset,
          comparisonType: emailComparisonType
        });
        if (emailDatePreset === 'custom' && emailCustomDates.start && emailCustomDates.end) {
          params.append('startDate', emailCustomDates.start);
          params.append('endDate', emailCustomDates.end);
        }

        const response = await fetch(`/api/email?${params.toString()}`);
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
  }, [section, emailDatePreset, emailCustomDates, emailComparisonType]);

  // Handle date filter changes
  const handleEmailDateChange = (preset: DatePreset, startDate?: string, endDate?: string) => {
    setEmailDatePreset(preset);
    if (preset === 'custom' && startDate && endDate) {
      setEmailCustomDates({ start: startDate, end: endDate });
    } else {
      setEmailCustomDates({});
    }
  };

  // Handle comparison type changes
  const handleEmailComparisonChange = (type: ComparisonType) => {
    setEmailComparisonType(type);
  };

  // Fetch product data when on product section or period changes
  useEffect(() => {
    if (section !== 'product') return;

    const fetchProductData = async () => {
      try {
        setProductLoading(true);
        setProductError(null);
        const response = await fetch(`/api/product?period=${productPeriod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product data');
        }
        const data = await response.json();
        setProductData(data);
      } catch (err) {
        setProductError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setProductLoading(false);
      }
    };
    fetchProductData();
  }, [section, productPeriod]);

  // Fetch customer data when on customers section
  useEffect(() => {
    if (section !== 'customers') return;

    const fetchCustomerData = async () => {
      try {
        setCustomerLoading(true);
        setCustomerError(null);
        const response = await fetch('/api/customer');
        if (!response.ok) {
          throw new Error('Failed to fetch customer data');
        }
        const data = await response.json();
        setCustomerData(data);
      } catch (err) {
        setCustomerError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setCustomerLoading(false);
      }
    };
    fetchCustomerData();
  }, [section]);

  // Fetch platform data when on platform section or period changes
  useEffect(() => {
    if (section !== 'platform') return;

    const fetchPlatformData = async () => {
      try {
        setPlatformLoading(true);
        setPlatformError(null);
        const response = await fetch(`/api/platform?period=${platformPeriod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch platform data');
        }
        const data = await response.json();
        setPlatformData(data);
      } catch (err) {
        setPlatformError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setPlatformLoading(false);
      }
    };
    fetchPlatformData();
  }, [section, platformPeriod]);

  // Fetch Facebook data when on facebook section or when date filter changes
  useEffect(() => {
    if (section !== 'facebook') return;

    const fetchFacebookData = async () => {
      try {
        setFacebookLoading(true);
        setFacebookError(null);

        // Build query params
        const params = new URLSearchParams({
          preset: facebookDatePreset,
          comparisonType: facebookComparisonType
        });
        if (facebookDatePreset === 'custom' && facebookCustomDates.start && facebookCustomDates.end) {
          params.append('startDate', facebookCustomDates.start);
          params.append('endDate', facebookCustomDates.end);
        }

        const response = await fetch(`/api/facebook?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Facebook data');
        }
        const data = await response.json();
        setFacebookData(data);
      } catch (err) {
        setFacebookError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setFacebookLoading(false);
      }
    };
    fetchFacebookData();
  }, [section, facebookDatePreset, facebookCustomDates, facebookComparisonType]);

  // Handle Facebook date filter changes
  const handleFacebookDateChange = (preset: DatePreset, startDate?: string, endDate?: string) => {
    setFacebookDatePreset(preset);
    if (preset === 'custom' && startDate && endDate) {
      setFacebookCustomDates({ start: startDate, end: endDate });
    } else {
      setFacebookCustomDates({});
    }
  };

  // Handle Facebook comparison type changes
  const handleFacebookComparisonChange = (type: ComparisonType) => {
    setFacebookComparisonType(type);
  };

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
        {/* Date Filter and Comparison Selector */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <DateFilter onDateChange={handleEmailDateChange} value={emailDatePreset} />
          <ComparisonSelector onComparisonChange={handleEmailComparisonChange} value={emailComparisonType} />
        </div>

        {/* Email KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>TOTAL EMAIL REVENUE</h3>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                ${(emailData.kpis.totalEmailRevenue.current / 1000).toFixed(1)}K
              </div>
              <div className={`inline-flex items-center text-lg font-medium ${emailData.kpis.totalEmailRevenue.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {emailData.kpis.totalEmailRevenue.change >= 0 ? '↑' : '↓'} {Math.abs(emailData.kpis.totalEmailRevenue.change).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm mt-2 space-y-1">
              <div style={{color: 'var(--text-secondary)'}}>
                vs ${(emailData.kpis.totalEmailRevenue.previous / 1000).toFixed(1)}K {emailComparisonType === 'previous-year' ? 'last year' : 'previous period'}
              </div>
              <div className={`flex items-center gap-1 ${emailData.kpis.totalEmailRevenue.pctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <span className="text-xs font-medium">
                  {emailData.kpis.totalEmailRevenue.pctOfTotal.toFixed(1)}% of total revenue
                </span>
                <span className="text-xs">
                  ({emailData.kpis.totalEmailRevenue.pctChange >= 0 ? '+' : ''}{emailData.kpis.totalEmailRevenue.pctChange.toFixed(1)}pp)
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>CAMPAIGN REVENUE</h3>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                ${(emailData.kpis.campaignRevenue.current / 1000).toFixed(1)}K
              </div>
              <div className={`inline-flex items-center text-lg font-medium ${emailData.kpis.campaignRevenue.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {emailData.kpis.campaignRevenue.change >= 0 ? '↑' : '↓'} {Math.abs(emailData.kpis.campaignRevenue.change).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm mt-2 space-y-1">
              <div style={{color: 'var(--text-secondary)'}}>
                {((emailData.kpis.campaignRevenue.current / emailData.kpis.totalEmailRevenue.current) * 100).toFixed(0)}% of Email
              </div>
              <div className={`flex items-center gap-1 ${emailData.kpis.campaignRevenue.pctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <span className="text-xs font-medium">
                  {emailData.kpis.campaignRevenue.pctOfTotal.toFixed(1)}% of total revenue
                </span>
                <span className="text-xs">
                  ({emailData.kpis.campaignRevenue.pctChange >= 0 ? '+' : ''}{emailData.kpis.campaignRevenue.pctChange.toFixed(1)}pp)
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>FLOW REVENUE</h3>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                ${(emailData.kpis.flowRevenue.current / 1000).toFixed(1)}K
              </div>
              <div className={`inline-flex items-center text-lg font-medium ${emailData.kpis.flowRevenue.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {emailData.kpis.flowRevenue.change >= 0 ? '↑' : '↓'} {Math.abs(emailData.kpis.flowRevenue.change).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm mt-2 space-y-1">
              <div style={{color: 'var(--text-secondary)'}}>
                {((emailData.kpis.flowRevenue.current / emailData.kpis.totalEmailRevenue.current) * 100).toFixed(0)}% of Email
              </div>
              <div className={`flex items-center gap-1 ${emailData.kpis.flowRevenue.pctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <span className="text-xs font-medium">
                  {emailData.kpis.flowRevenue.pctOfTotal.toFixed(1)}% of total revenue
                </span>
                <span className="text-xs">
                  ({emailData.kpis.flowRevenue.pctChange >= 0 ? '+' : ''}{emailData.kpis.flowRevenue.pctChange.toFixed(1)}pp)
                </span>
              </div>
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
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Category</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Purchases</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Days Active</th>
                </tr>
              </thead>
              <tbody>
                {emailData.tables.flows.map((flow: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.flowName}</td>
                    <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{flow.flowCategory}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${flow.revenue.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{flow.purchases}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-secondary)'}}>{flow.daysActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Customers section
  if (section === 'customers') {

    // Show loading state
    if (customerLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading customer data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (customerError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{customerError}</p>
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

    // Show customer dashboard
    if (!customerData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* CLV & Churn Risk Dashboard */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-8" style={{color: 'var(--text-primary)'}}>CLV & Churn Risk Dashboard</h3>
          <CustomerCLVDashboard data={customerData.clvData} />
        </div>
      </div>
    );
  }

  // Platform section
  if (section === 'platform') {
    // Show loading state
    if (platformLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading platform data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (platformError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{platformError}</p>
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

    // Show platform dashboard
    if (!platformData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }

    const periodOptions = [
      { value: '7d', label: '7D' },
      { value: '30d', label: '30D' },
      { value: '60d', label: '60D' },
      { value: '90d', label: '90D' },
    ];

    return (
      <div className="space-y-8">
        {/* Channel Performance Matrix */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
              Paid Media Efficiency Matrix
            </h3>
            {/* Period Selector */}
            <div className="flex gap-2">
              {periodOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPlatformPeriod(option.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    platformPeriod === option.value ? 'btn-primary' : ''
                  }`}
                  style={platformPeriod !== option.value ? {
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-secondary)'
                  } : {}}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <PlatformPerformanceMatrix data={platformData.platformMetrics} roasTarget={6.5} period={platformPeriod} />
        </div>

        {/* Campaign-Level Marginal ROAS - Hidden for now */}
        {false && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
              Campaign-Level Marginal ROAS
            </h3>
            <CampaignMarginalROAS data={platformData.campaignTypes} />
          </div>
        )}
      </div>
    );
  }

  // Facebook section
  if (section === 'facebook') {
    // Show loading state
    if (facebookLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading Facebook data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (facebookError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{facebookError}</p>
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

    // Show Facebook dashboard
    if (!facebookData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }

    const roasTarget = 5;

    return (
      <div className="space-y-8">
        {/* Date Filter and Comparison Selector */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <DateFilter onDateChange={handleFacebookDateChange} value={facebookDatePreset} />
          <ComparisonSelector onComparisonChange={handleFacebookComparisonChange} value={facebookComparisonType} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          {/* Facebook Spend */}
          <KPICard
            title="Facebook Spend"
            currentValue={`$${(facebookData.spend.current / 1000).toFixed(1)}K`}
            previousValue={`$${(facebookData.spend.previous / 1000).toFixed(1)}K`}
            trend={facebookData.spend.change}
            gaugeValue={facebookData.spend.current}
            gaugeMax={facebookData.spend.current * 1.5}
            gaugeLabel="Spend"
            status={facebookData.spend.change > 10 ? 'warning' : 'good'}
            dateRange={dateRange}
          />

          {/* Facebook Revenue */}
          <KPICard
            title="Facebook Revenue"
            currentValue={`$${(facebookData.revenue.current / 1000).toFixed(1)}K`}
            previousValue={`$${(facebookData.revenue.previous / 1000).toFixed(1)}K`}
            trend={facebookData.revenue.change}
            gaugeValue={facebookData.revenue.current}
            gaugeMax={facebookData.revenue.current * 1.5}
            gaugeLabel="Revenue"
            status={facebookData.revenue.change > 0 ? 'excellent' : 'warning'}
            dateRange={dateRange}
          />

          {/* Facebook ROAS */}
          <KPICard
            title="Facebook ROAS"
            currentValue={`${facebookData.roas.current.toFixed(2)}x`}
            previousValue={`${facebookData.roas.previous.toFixed(2)}x`}
            trend={facebookData.roas.change}
            gaugeValue={facebookData.roas.current}
            gaugeTarget={roasTarget}
            gaugeMax={roasTarget * 2}
            gaugeLabel={`Target: ${roasTarget}x`}
            status={facebookData.roas.current >= roasTarget ? 'excellent' : facebookData.roas.current >= roasTarget * 0.8 ? 'good' : 'warning'}
            dateRange={dateRange}
          />

          {/* Facebook Impressions */}
          <KPICard
            title="Facebook Impressions"
            currentValue={`${(facebookData.impressions.current / 1000).toFixed(0)}K`}
            previousValue={`${(facebookData.impressions.previous / 1000).toFixed(0)}K`}
            trend={facebookData.impressions.change}
            gaugeValue={facebookData.impressions.current}
            gaugeMax={facebookData.impressions.current * 1.5}
            gaugeLabel="Impressions"
            status={facebookData.impressions.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />

          {/* Facebook Clicks */}
          <KPICard
            title="Facebook Clicks"
            currentValue={facebookData.clicks.current.toLocaleString()}
            previousValue={facebookData.clicks.previous.toLocaleString()}
            trend={facebookData.clicks.change}
            gaugeValue={facebookData.clicks.current}
            gaugeMax={facebookData.clicks.current * 1.5}
            gaugeLabel="Clicks"
            status={facebookData.clicks.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />
        </div>

        {/* Performance Chart */}
        <ChartCard
          title={`Facebook Revenue - Current vs ${facebookComparisonType === 'previous-year' ? 'Last Year' : 'Previous Period'}`}
          type="line"
          dateRange={dateRange}
          data={facebookData.dailyMetrics}
        />
      </div>
    );
  }

  // Product section
  if (section === 'product') {
    // Show loading state
    if (productLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading product data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (productError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{productError}</p>
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

    // Show product dashboard with real data
    if (!productData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No data available</p>
        </div>
      );
    }

    const periodOptions = [
      { value: '7d', label: '7D' },
      { value: '14d', label: '14D' },
      { value: '30d', label: '30D' },
      { value: '180d', label: '180D' },
    ];

    // Calculate total revenue for percentage calculations
    const totalRevenue = productData.products.reduce((sum: number, product: any) => sum + product.revenue, 0);

    return (
      <div className="space-y-8">
        {/* Product Performance Table */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Product Performance</h3>
            <div className="flex gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setProductPeriod(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    productPeriod === option.value
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Product</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Units Sold</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>% of Total</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Inventory</th>
                  <th className="text-center py-3 px-2" style={{color: 'var(--text-muted)'}}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {productData.products.map((product: any, idx: number) => {
                  const revenuePercentage = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;

                  return (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                      <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{product.productName}</td>
                      <td className="text-right py-3 px-2">
                        <div className="flex flex-col items-end">
                          <span style={{color: 'var(--text-primary)'}}>{product.unitsSold.toLocaleString()}</span>
                          <span className={`text-xs ${product.unitsChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {product.unitsChangePct >= 0 ? '↑' : '↓'} {Math.abs(product.unitsChangePct).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="flex flex-col items-end">
                          <span style={{color: 'var(--text-primary)'}}>${product.revenue.toLocaleString()}</span>
                          <span className={`text-xs ${product.revenueChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {product.revenueChangePct >= 0 ? '↑' : '↓'} {Math.abs(product.revenueChangePct).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-base font-semibold" style={{color: 'var(--text-primary)'}}>
                          {revenuePercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{product.inventory.toLocaleString()}</td>
                      <td className="text-center py-3 px-2" style={{color: 'var(--text-secondary)'}}>{product.performance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grip Customer Behavior Analysis - 2/3 and 1/3 split */}
        <div className="grid grid-cols-3 gap-6">
          {/* Grip Switching Patterns - 2/3 width */}
          <div className="col-span-2 card p-6">
            <h3 className="text-lg font-semibold mb-8" style={{color: 'var(--text-primary)'}}>Grip Switching & Loyalty Patterns</h3>
            <GripSwitchingSankey data={productData.gripSwitching || []} />
          </div>

          {/* Repeat Purchase Table - 1/3 width */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Grip Repeat Purchase Analysis</h3>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Grip Type</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Repeat %</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {productData.gripAnalysis.map((grip: any, idx: number) => (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                      <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{grip.gripType}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{grip.repeatRate.toFixed(1)}%</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{grip.customerCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explainer Text */}
            <div className="p-4 rounded-lg" style={{backgroundColor: 'var(--bg-primary-30)', border: '1px solid var(--border-muted)'}}>
              <p className="text-xs font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
                Why More Orders Than Customers Makes Sense:
              </p>
              <p className="text-xs mb-3" style={{color: 'var(--text-muted)', lineHeight: '1.5'}}>
                The view tracks all repeat purchases within 365 days, not just the first switch. A single customer can contribute multiple orders to a switching pattern.
              </p>

              <p className="text-xs font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
                Example Customer Journey:
              </p>
              <ul className="text-xs mb-3 space-y-1" style={{color: 'var(--text-muted)', paddingLeft: '1rem'}}>
                <li>Day 0: First purchase → Counterbalanced</li>
                <li>Day 30: Second purchase → Lightweight (1 switching order)</li>
                <li>Day 90: Third purchase → Lightweight (another switching order)</li>
                <li>Day 180: Fourth purchase → Lightweight (yet another switching order)</li>
              </ul>

              <p className="text-xs font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                Result:
              </p>
              <p className="text-xs mb-3" style={{color: 'var(--text-muted)'}}>
                1 customer, but 3 orders in the "Counterbalanced → Lightweight" switching pattern
              </p>

              <p className="text-xs font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                The Math:
              </p>
              <p className="text-xs" style={{color: 'var(--text-muted)', lineHeight: '1.5'}}>
                Once someone switches, they buy the new grip type an average of 1.69 times within the 365-day window.
              </p>
            </div>
          </div>
        </div>

        {/* Product Affinity - Three columns */}
        <div className="grid grid-cols-3 gap-6">
          {/* Product Rankings */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top Products by Revenue</h3>
            <ProductRankings data={productData.rankings} />
          </div>

          {/* Bundle Recommendations */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Bundle Opportunities</h3>
            <ProductBundleTable data={productData.affinity} />
          </div>

          {/* Also Bought Widget */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Also Purchased With</h3>
            <ProductAlsoBought data={productData.affinity} />
          </div>
        </div>

        {/* Geographic Performance - Map and Table Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* US Revenue Heat Map */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>US Revenue Heat Map (30 Days)</h3>
            <USRevenueMap data={productData.geoPerformance} />
          </div>

          {/* Top States Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top 10 States by Revenue (30 Days)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>State</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Units</th>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Top Product</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Top Product Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {productData.geoPerformance.slice(0, 10).map((geo: any, idx: number) => (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                      <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{geo.state}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${geo.revenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{geo.units.toLocaleString()}</td>
                      <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{geo.topProduct}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${geo.topProductRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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