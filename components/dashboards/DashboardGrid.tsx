'use client';

import { useState, useEffect, useCallback } from 'react';
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
import PutterGripSwitchingSankey from './widgets/PutterGripSwitchingSankey';
import CustomerCLVDashboard from './widgets/CustomerCLVDashboard';
import CustomerOverviewKPIs from './widgets/CustomerOverviewKPIs';
import LTVIntelligence from './widgets/LTVIntelligence';
import CustomerJourneyAnalysis from './widgets/CustomerJourneyAnalysis';
import { Loader2, FrownIcon } from 'lucide-react';
import { formatCurrency as baseFomatCurrency, formatNumber } from '@/lib/format';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [currentClient, setCurrentClient] = useState<string>('jumbomax');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [currencyLoaded, setCurrencyLoaded] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailData, setEmailData] = useState<any>(null);

  // Funnel optimization state
  const [funnelData, setFunnelData] = useState<any>({});
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [funnelCountry, setFunnelCountry] = useState<string>('United States');
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
  const [facebookData, setFacebookData] = useState<any>(null);
  const [facebookLoading, setFacebookLoading] = useState(true);
  const [facebookError, setFacebookError] = useState<string | null>(null);
  const [facebookDatePreset, setFacebookDatePreset] = useState<DatePreset>('mtd');
  const [facebookCustomDates, setFacebookCustomDates] = useState<{ start?: string; end?: string }>({});
  const [facebookComparisonType, setFacebookComparisonType] = useState<ComparisonType>('previous-period');
  const [googleData, setGoogleData] = useState<any>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleDatePreset, setGoogleDatePreset] = useState<DatePreset>('mtd');
  const [googleCustomDates, setGoogleCustomDates] = useState<{ start?: string; end?: string }>({});
  const [googleComparisonType, setGoogleComparisonType] = useState<ComparisonType>('previous-period');
  const [operationalData, setOperationalData] = useState<any>(null);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalError, setOperationalError] = useState<string | null>(null);
  const [customPrices, setCustomPrices] = useState<{[key: string]: number}>({});
  const [overviewPeriod, setOverviewPeriod] = useState<'7d' | 'mtd' | '30d'>('7d');
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [metaRoasPredictions, setMetaRoasPredictions] = useState<any>(null);
  const [metaRoasLoading, setMetaRoasLoading] = useState(true);

  // Currency-aware formatCurrency wrapper
  const formatCurrency = useCallback((value: number | null | undefined, decimals: number = 1): string => {
    console.log('[formatCurrency] Using currency symbol:', currencySymbol);
    return baseFomatCurrency(value, decimals, currencySymbol);
  }, [currencySymbol]);

  // Fetch current client on mount - MUST complete before rendering
  useEffect(() => {
    const fetchCurrentClient = async () => {
      try {
        const response = await fetch('/api/admin/current-client');
        if (response.ok) {
          const data = await response.json();
          console.log('[DashboardGrid] Current client:', data.clientId);
          setCurrentClient(data.clientId);

          // Fetch client config to get currency symbol
          const configResponse = await fetch('/api/admin/clients');
          if (configResponse.ok) {
            const clients = await configResponse.json();
            console.log('[DashboardGrid] All clients:', clients);
            const client = clients.find((c: any) => c.id === data.clientId);
            console.log('[DashboardGrid] Found client config:', client);
            if (client?.dashboard?.currencySymbol) {
              console.log('[DashboardGrid] Setting currency symbol to:', client.dashboard.currencySymbol);
              setCurrencySymbol(client.dashboard.currencySymbol);
            } else {
              console.log('[DashboardGrid] No currency symbol found in client config');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current client:', error);
      } finally {
        setCurrencyLoaded(true); // Currency is now loaded
      }
    };
    fetchCurrentClient();
  }, []);

  // Fetch dashboard data only after currency is loaded
  useEffect(() => {
    if (!currencyLoaded) return; // Wait for currency to load

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching dashboard data for period:', overviewPeriod);

        const response = await fetch(`/api/dashboard?period=${overviewPeriod}`);

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
  }, [overviewPeriod, currencyLoaded]); // Refetch when period changes or currency loads

  // Fetch funnel data when on funnel section - fetch all goals
  useEffect(() => {
    if (section !== 'funnel' || !currencyLoaded) return;

    const fetchAllFunnelData = async () => {
      try {
        setFunnelLoading(true);
        const goals = ['awareness', 'efficiency', 'engagement', 'revenue', 'conversion', 'composite', 'allstars'];

        const results = await Promise.all(
          goals.map(async (goal) => {
            const response = await fetch(`/api/dashboard/funnel?goal=${goal}&country=${encodeURIComponent(funnelCountry)}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${goal} data`);
            }
            const data = await response.json();
            return { goal, data };
          })
        );

        const allData: any = {};
        results.forEach(({ goal, data }) => {
          allData[goal] = data.bundles;
        });

        setFunnelData(allData);
      } catch (err) {
        console.error('Error fetching funnel data:', err);
      } finally {
        setFunnelLoading(false);
      }
    };

    fetchAllFunnelData();
  }, [section, funnelCountry, currencyLoaded]);

  // Fetch email data when on email section or when date filter changes
  useEffect(() => {
    if (section !== 'email' || !currencyLoaded) return;

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
  }, [section, emailDatePreset, emailCustomDates, emailComparisonType, currencyLoaded]);

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
    if (section !== 'product' || !currencyLoaded) return;

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
  }, [section, productPeriod, currencyLoaded]);

  // Fetch customer data when on customers section
  useEffect(() => {
    if (section !== 'customers' || !currencyLoaded) return;

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
  }, [section, currencyLoaded]);

  // Fetch Facebook data when on facebook section or when date filter changes
  useEffect(() => {
    if (section !== 'facebook' || !currencyLoaded) return;

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
        console.log('Facebook API Response:', data);
        console.log('Country Performance:', data.countryPerformance);
        setFacebookData(data);
      } catch (err) {
        setFacebookError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setFacebookLoading(false);
      }
    };
    fetchFacebookData();
  }, [section, facebookDatePreset, facebookCustomDates, facebookComparisonType, currencyLoaded]);

  // Fetch Meta ROAS Predictions when on facebook or overview section
  useEffect(() => {
    if ((section !== 'facebook' && section !== 'overview') || !currencyLoaded) return;

    const fetchMetaRoasPredictions = async () => {
      try {
        setMetaRoasLoading(true);
        const response = await fetch('/api/meta-roas-predictions');
        if (!response.ok) {
          throw new Error('Failed to fetch Meta ROAS predictions');
        }
        const data = await response.json();
        console.log('Meta ROAS Predictions:', data);
        setMetaRoasPredictions(data);
      } catch (err) {
        console.error('Error fetching Meta ROAS predictions:', err);
        setMetaRoasPredictions(null);
      } finally {
        setMetaRoasLoading(false);
      }
    };
    fetchMetaRoasPredictions();
  }, [section, currencyLoaded]);

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

  // Fetch Google Ads data when on google section or when date filter changes
  useEffect(() => {
    if (section !== 'google' || !currencyLoaded) return;

    const fetchGoogleData = async () => {
      try {
        setGoogleLoading(true);
        setGoogleError(null);

        // Build query params
        const params = new URLSearchParams({
          preset: googleDatePreset,
          comparisonType: googleComparisonType
        });
        if (googleDatePreset === 'custom' && googleCustomDates.start && googleCustomDates.end) {
          params.append('startDate', googleCustomDates.start);
          params.append('endDate', googleCustomDates.end);
        }

        const response = await fetch(`/api/google?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Google Ads data');
        }
        const data = await response.json();
        setGoogleData(data);
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setGoogleLoading(false);
      }
    };
    fetchGoogleData();
  }, [section, googleDatePreset, googleCustomDates, googleComparisonType, currencyLoaded]);

  // Handle Google Ads date filter changes
  const handleGoogleDateChange = (preset: DatePreset, startDate?: string, endDate?: string) => {
    setGoogleDatePreset(preset);
    if (preset === 'custom' && startDate && endDate) {
      setGoogleCustomDates({ start: startDate, end: endDate });
    } else {
      setGoogleCustomDates({});
    }
  };

  // Handle Google Ads comparison type changes
  const handleGoogleComparisonChange = (type: ComparisonType) => {
    setGoogleComparisonType(type);
  };

  // Fetch operational data when on operational section
  useEffect(() => {
    if (section !== 'operational' || !currencyLoaded) return;

    const fetchOperationalData = async () => {
      try {
        setOperationalLoading(true);
        setOperationalError(null);
        const response = await fetch('/api/operational');
        if (!response.ok) {
          throw new Error('Failed to fetch operational data');
        }
        const data = await response.json();
        setOperationalData(data);
      } catch (err) {
        setOperationalError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setOperationalLoading(false);
      }
    };
    fetchOperationalData();
  }, [section, currencyLoaded]);

  // Fetch forecasting data when on forecasting section
  useEffect(() => {
    if (section !== 'forecasting' || !currencyLoaded) return;

    const fetchForecastData = async () => {
      try {
        setForecastLoading(true);
        setForecastError(null);
        const response = await fetch('/api/forecasting');
        if (!response.ok) {
          throw new Error('Failed to fetch forecasting data');
        }
        const data = await response.json();
        setForecastData(data);
      } catch (err) {
        setForecastError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecastData();
  }, [section, currencyLoaded]);

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

    // Helper function to get the right period data
    const getPeriodData = (kpi: any) => {
      switch (overviewPeriod) {
        case '7d':
          return kpi.periodData.sevenDay;
        case 'mtd':
          return kpi.periodData.monthToDate;
        case '30d':
          return kpi.periodData.thirtyDay;
        default:
          return kpi.periodData.sevenDay;
      }
    };

    return (
      <div className="space-y-8">
        {/* Period Selector */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOverviewPeriod('7d')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              overviewPeriod === '7d' ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setOverviewPeriod('mtd')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              overviewPeriod === 'mtd' ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}
          >
            Month to Date
          </button>
          <button
            onClick={() => setOverviewPeriod('30d')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              overviewPeriod === '30d' ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}
          >
            Last 30 Days
          </button>
        </div>

        {/* Big 5 KPIs - Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
          {/* Total Revenue */}
          <KPICard
            title="TOTAL REVENUE"
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.totalRevenue).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.totalRevenue).trend || 0}
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
            currentValue={`${getPeriodData(dashboardData.kpis.blendedROAS).value.toFixed(2)}x`}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.blendedROAS).trend || 0}
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
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.paidMediaSpend).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.paidMediaSpend).trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: formatCurrency(dashboardData.kpis.paidMediaSpend.periodData?.sevenDay?.value || 0),
                trend: dashboardData.kpis.paidMediaSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: formatCurrency(dashboardData.kpis.paidMediaSpend.periodData?.thirtyDay?.value || 0),
                trend: dashboardData.kpis.paidMediaSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.paidMediaSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.paidMediaSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.paidMediaSpend.gaugeTarget}
            gaugeLabel={`${formatCurrency(dashboardData.kpis.paidMediaSpend.gaugeValue, 1)} / ${formatCurrency(dashboardData.kpis.paidMediaSpend.gaugeTarget, 0)} Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Email Revenue - Hidden for HB (no Klaviyo) */}
          {currentClient !== 'hb' && dashboardData.kpis.emailPerformance && (
            <KPICard
              title="EMAIL REVENUE"
              currentValue={formatCurrency(getPeriodData(dashboardData.kpis.emailPerformance).value)}
              previousValue={undefined}
              trend={getPeriodData(dashboardData.kpis.emailPerformance).trend || 0}
              subtitle={undefined}
              periodData={{
                sevenDay: {
                  value: formatCurrency(dashboardData.kpis.emailPerformance.periodData?.sevenDay?.value || 0),
                  trend: dashboardData.kpis.emailPerformance.periodData?.sevenDay?.trend || 0
                },
                thirtyDay: {
                  value: formatCurrency(dashboardData.kpis.emailPerformance.periodData?.thirtyDay?.value || 0),
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
          )}

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
                  {formatCurrency(dashboardData.kpis.revenueForecast.totalForecasted)}
                </div>

                {/* Range */}
                <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Range: {formatCurrency(dashboardData.kpis.revenueForecast.lowerBound)} - {formatCurrency(dashboardData.kpis.revenueForecast.upperBound)}
                </div>

                {/* Suggested Spend */}
                <div className="flex items-center justify-between text-sm">
                  <span style={{color: 'var(--text-muted)'}}>Suggested Spend:</span>
                  <span className="font-semibold" style={{color: 'var(--text-primary)'}}>
                    {formatCurrency(dashboardData.kpis.revenueForecast.suggestedSpend)}
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

          {/* Meta ROAS Prediction */}
          {metaRoasPredictions && !metaRoasLoading && (
            <div className="card p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                    META ROAS PREDICTION
                  </h3>
                  <span className="text-xs px-2 py-1 rounded" style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)'
                  }}>
                    {metaRoasPredictions.predictionMethod}
                  </span>
                </div>

                {/* Main Prediction Value */}
                <div className="space-y-3">
                  <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {metaRoasPredictions.predictedMetaRoas.toFixed(2)}x
                  </div>

                  {/* Range */}
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Range: {metaRoasPredictions.lowerBound.toFixed(2)}x - {metaRoasPredictions.upperBound.toFixed(2)}x
                  </div>
                </div>

                {/* Visual Bar for Range */}
                <div className="space-y-2">
                  <div className="relative h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                    {/* Lower to Upper Range */}
                    <div
                      className="absolute h-3 rounded-full"
                      style={{
                        left: `${(metaRoasPredictions.lowerBound / metaRoasPredictions.upperBound) * 100}%`,
                        right: '0%',
                        background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                        opacity: 0.3
                      }}
                    />
                    {/* Predicted Point */}
                    <div
                      className="absolute h-3 w-1 rounded-full"
                      style={{
                        left: `${(metaRoasPredictions.predictedMetaRoas / metaRoasPredictions.upperBound) * 100}%`,
                        background: 'var(--accent-primary)',
                        transform: 'translateX(-50%)'
                      }}
                    />
                  </div>

                  {/* Labels */}
                  <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
                    <span>{metaRoasPredictions.lowerBound.toFixed(2)}x</span>
                    <span>{metaRoasPredictions.upperBound.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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

        {/* Platform Performance - 6 Cards in One Row (hide Google for PuttOut) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${currentClient !== 'puttout' ? 'xl:grid-cols-6' : ''}`}>
          {/* Google Spend - Only show for JumboMax */}
          {currentClient !== 'puttout' && <KPICard
            title="GOOGLE SPEND"
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.googleSpend).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.googleSpend).trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: formatCurrency(dashboardData.kpis.googleSpend.periodData?.sevenDay?.value || 0),
                trend: dashboardData.kpis.googleSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: formatCurrency(dashboardData.kpis.googleSpend.periodData?.thirtyDay?.value || 0),
                trend: dashboardData.kpis.googleSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.googleSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.googleSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.googleSpend.gaugeTarget}
            gaugeLabel={`${formatCurrency(dashboardData.kpis.googleSpend.gaugeValue, 1)} / ${formatCurrency(dashboardData.kpis.googleSpend.gaugeTarget, 0)} Target`}
            status="excellent"
            dateRange={dateRange}
          />}

          {/* Google Revenue - Only show for JumboMax */}
          {currentClient !== 'puttout' && <KPICard
            title="GOOGLE REVENUE"
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.googleRevenue).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.googleRevenue).trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: formatCurrency(dashboardData.kpis.googleRevenue.periodData?.sevenDay?.value || 0),
                trend: dashboardData.kpis.googleRevenue.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: formatCurrency(dashboardData.kpis.googleRevenue.periodData?.thirtyDay?.value || 0),
                trend: dashboardData.kpis.googleRevenue.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.googleRevenue.gaugeValue}
            gaugeMax={dashboardData.kpis.googleRevenue.gaugeMax}
            gaugeTarget={dashboardData.kpis.googleRevenue.gaugeTarget}
            gaugeLabel={`${formatCurrency(dashboardData.kpis.googleRevenue.gaugeValue, 1)} / ${formatCurrency(dashboardData.kpis.googleRevenue.gaugeTarget, 0)} Target`}
            status="excellent"
            dateRange={dateRange}
          />}

          {/* Google ROAS - Only show for JumboMax */}
          {currentClient !== 'puttout' && <KPICard
            title="GOOGLE ROAS"
            currentValue={`${getPeriodData(dashboardData.kpis.googleROAS).value.toFixed(2)}x`}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.googleROAS).trend || 0}
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
          />}

          {/* Meta Spend */}
          <KPICard
            title="META SPEND"
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.metaSpend).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.metaSpend).trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: formatCurrency(dashboardData.kpis.metaSpend.periodData?.sevenDay?.value || 0),
                trend: dashboardData.kpis.metaSpend.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: formatCurrency(dashboardData.kpis.metaSpend.periodData?.thirtyDay?.value || 0),
                trend: dashboardData.kpis.metaSpend.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.metaSpend.gaugeValue}
            gaugeMax={dashboardData.kpis.metaSpend.gaugeMax}
            gaugeTarget={dashboardData.kpis.metaSpend.gaugeTarget}
            gaugeLabel={`${formatCurrency(dashboardData.kpis.metaSpend.gaugeValue, 1)} / ${formatCurrency(dashboardData.kpis.metaSpend.gaugeTarget, 0)} Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Meta Revenue */}
          <KPICard
            title="META REVENUE"
            currentValue={formatCurrency(getPeriodData(dashboardData.kpis.metaRevenue).value)}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.metaRevenue).trend || 0}
            subtitle={undefined}
            periodData={{
              sevenDay: {
                value: formatCurrency(dashboardData.kpis.metaRevenue.periodData?.sevenDay?.value || 0),
                trend: dashboardData.kpis.metaRevenue.periodData?.sevenDay?.trend || 0
              },
              thirtyDay: {
                value: formatCurrency(dashboardData.kpis.metaRevenue.periodData?.thirtyDay?.value || 0),
                trend: dashboardData.kpis.metaRevenue.periodData?.thirtyDay?.trend || 0
              }
            }}
            gaugeValue={dashboardData.kpis.metaRevenue.gaugeValue}
            gaugeMax={dashboardData.kpis.metaRevenue.gaugeMax}
            gaugeTarget={dashboardData.kpis.metaRevenue.gaugeTarget}
            gaugeLabel={`${formatCurrency(dashboardData.kpis.metaRevenue.gaugeValue, 1)} / ${formatCurrency(dashboardData.kpis.metaRevenue.gaugeTarget, 0)} Target`}
            status="excellent"
            dateRange={dateRange}
          />

          {/* Meta ROAS */}
          <KPICard
            title="META ROAS"
            currentValue={`${getPeriodData(dashboardData.kpis.metaROAS).value.toFixed(2)}x`}
            previousValue={undefined}
            trend={getPeriodData(dashboardData.kpis.metaROAS).trend || 0}
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

        {/* Business Health Metrics - 5 Cards */}
        {dashboardData.kpis.businessHealth && (
          <div>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Business Health & Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {/* Business Health Index - Hidden for HB */}
              {currentClient !== 'hb' && (
              <div className="card p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                    BUSINESS HEALTH
                  </h3>

                  <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {dashboardData.kpis.businessHealth.healthIndex}
                  </div>

                  {/* Trend Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: dashboardData.kpis.businessHealth.revenueTrend === 'REVENUE_GROWING' ? 'rgba(34, 197, 94, 0.1)' : dashboardData.kpis.businessHealth.revenueTrend === 'REVENUE_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: dashboardData.kpis.businessHealth.revenueTrend === 'REVENUE_GROWING' ? '#22c55e' : dashboardData.kpis.businessHealth.revenueTrend === 'REVENUE_DECLINING' ? '#ef4444' : '#f59e0b'
                      }}
                    >
                      {dashboardData.kpis.businessHealth.revenueTrend.replace('REVENUE_', '')}
                    </span>
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: dashboardData.kpis.businessHealth.demandTrend === 'DEMAND_GROWING' ? 'rgba(34, 197, 94, 0.1)' : dashboardData.kpis.businessHealth.demandTrend === 'DEMAND_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: dashboardData.kpis.businessHealth.demandTrend === 'DEMAND_GROWING' ? '#22c55e' : dashboardData.kpis.businessHealth.demandTrend === 'DEMAND_DECLINING' ? '#ef4444' : '#f59e0b'
                      }}
                    >
                      {dashboardData.kpis.businessHealth.demandTrend.replace('DEMAND_', '')} DEMAND
                    </span>
                  </div>

                  {/* Health Gauge */}
                  <div className="space-y-2">
                    <div className="relative h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                      <div
                        className="absolute top-0 left-0 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(dashboardData.kpis.businessHealth.healthIndex / 100) * 100}%`,
                          background: dashboardData.kpis.businessHealth.healthIndex >= 70 ? 'linear-gradient(90deg, var(--accent-primary), #22c55e)' : dashboardData.kpis.businessHealth.healthIndex >= 40 ? 'linear-gradient(90deg, var(--accent-primary), #f59e0b)' : 'linear-gradient(90deg, var(--accent-primary), #ef4444)'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
                      <span>0</span>
                      <span>{dashboardData.kpis.businessHealth.gaugeTarget} Target</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Search Demand - Hidden for HB */}
              {currentClient !== 'hb' && dashboardData.kpis.searchDemand && (
                <div className="card p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                      SEARCH DEMAND
                    </h3>

                    <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                      {(dashboardData.kpis.searchDemand.current / 1000).toFixed(1)}K
                    </div>

                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      7-Day Avg Impressions
                    </div>

                    {/* YoY Change */}
                    <div className={`text-sm font-medium ${dashboardData.kpis.searchDemand.yoyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {dashboardData.kpis.searchDemand.yoyChange >= 0 ? '↑' : '↓'} {Math.abs(dashboardData.kpis.searchDemand.yoyChange).toFixed(1)}% YoY
                    </div>

                    {/* Trend Badge */}
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: dashboardData.kpis.searchDemand.trend === 'DEMAND_GROWING' ? 'rgba(34, 197, 94, 0.1)' : dashboardData.kpis.searchDemand.trend === 'DEMAND_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: dashboardData.kpis.searchDemand.trend === 'DEMAND_GROWING' ? '#22c55e' : dashboardData.kpis.searchDemand.trend === 'DEMAND_DECLINING' ? '#ef4444' : '#f59e0b'
                      }}
                    >
                      {dashboardData.kpis.searchDemand.trend.replace('DEMAND_', '')}
                    </span>
                  </div>
                </div>
              )}

              {/* Brand Awareness - Hidden for HB */}
              {currentClient !== 'hb' && dashboardData.kpis.brandAwareness && (
                <div className="card p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                      BRAND AWARENESS
                    </h3>

                    <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                      {(dashboardData.kpis.brandAwareness.current).toFixed(0)}
                    </div>

                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      30-Day Avg Brand Impressions
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="relative h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                        <div
                          className="absolute top-0 left-0 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((dashboardData.kpis.brandAwareness.gaugeValue / dashboardData.kpis.brandAwareness.gaugeMax) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, var(--accent-primary), #22c55e)'
                          }}
                        />
                      </div>
                      <div className="text-xs text-center" style={{color: 'var(--text-muted)'}}>
                        Target: {dashboardData.kpis.brandAwareness.gaugeTarget.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Momentum */}
              {dashboardData.kpis.revenueMomentum && (
                <div className="card p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                      REVENUE MOMENTUM
                    </h3>

                    <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                      {(dashboardData.kpis.revenueMomentum.revenue7dAvg / 1000).toFixed(1)}K
                    </div>

                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      7-Day Avg Daily Revenue
                    </div>

                    {/* Acceleration */}
                    <div className={`text-sm font-medium ${dashboardData.kpis.revenueMomentum.acceleration >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {dashboardData.kpis.revenueMomentum.acceleration >= 0 ? '↑ Accelerating' : '↓ Decelerating'} {Math.abs(dashboardData.kpis.revenueMomentum.acceleration).toFixed(1)}%
                    </div>

                    {/* Trend Badge */}
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: dashboardData.kpis.revenueMomentum.trend === 'REVENUE_GROWING' ? 'rgba(34, 197, 94, 0.1)' : dashboardData.kpis.revenueMomentum.trend === 'REVENUE_DECLINING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: dashboardData.kpis.revenueMomentum.trend === 'REVENUE_GROWING' ? '#22c55e' : dashboardData.kpis.revenueMomentum.trend === 'REVENUE_DECLINING' ? '#ef4444' : '#f59e0b'
                      }}
                    >
                      {dashboardData.kpis.revenueMomentum.trend.replace('REVENUE_', '')}
                    </span>

                    <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                      vs 30D Avg: {formatCurrency(dashboardData.kpis.revenueMomentum.revenue30dAvg)}
                    </div>
                  </div>
                </div>
              )}

              {/* Business Health Calculation */}
              <div className="card p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>
                    HEALTH CALCULATION
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <th className="text-left pb-2 font-semibold" style={{color: 'var(--text-primary)'}}>Metric</th>
                          <th className="text-left pb-2 font-semibold" style={{color: 'var(--text-primary)'}}>Time Window</th>
                          <th className="text-left pb-2 font-semibold" style={{color: 'var(--text-primary)'}}>Comparison</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>business_health_index</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>Mixed (7d, 30d, YoY)</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>Composite of all trends</td>
                        </tr>
                        <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>business_revenue_trend</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>7-day avg vs 30-day avg</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>Recent vs baseline</td>
                        </tr>
                        <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>business_demand_trend</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>7-day avg vs 7-day avg from 30d ago</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>Current vs 1 month ago</td>
                        </tr>
                        <tr>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>business_yoy_status</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>Today vs 364 days ago</td>
                          <td className="py-2" style={{color: 'var(--text-secondary)'}}>This year vs last year</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Funnel Optimization section
  if (section === 'funnel') {
    if (funnelLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
        </div>
      );
    }

    const goalConfigs = [
      { key: 'allstars', title: 'ALL-STARS', subtitle: 'Top 3 Per Stage' },
      { key: 'awareness', title: 'AWARENESS', subtitle: 'Max Clicks + Low CPC' },
      { key: 'efficiency', title: 'EFFICIENCY', subtitle: 'Lowest CPC' },
      { key: 'engagement', title: 'ENGAGEMENT', subtitle: 'Highest CTR' },
      { key: 'revenue', title: 'REVENUE', subtitle: 'Highest ROAS' },
      { key: 'conversion', title: 'CONVERSION', subtitle: 'Highest Conv Rate' },
      { key: 'composite', title: 'COMPOSITE', subtitle: 'Balanced Score' }
    ];

    const countries = ['United States', 'Canada', 'United Kingdom'];

    const renderBundleCard = (bundle: any, rank: number) => {
      return (
        <div key={rank} className="p-3 rounded-lg mb-2" style={{background: 'var(--bg-elevated)'}}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="text-xs font-bold mb-1" style={{color: 'var(--text-muted)'}}>
                #{rank}
              </div>
              <div className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{bundle.adName}</div>
              {bundle.adsetName && (
                <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>{bundle.adsetName}</div>
              )}
            </div>
            <span className="px-2 py-1 rounded text-xs ml-2" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-secondary)'
            }}>
              {bundle.recommendedStage}
            </span>
          </div>

          {/* Funnel Scores */}
          <div className="grid grid-cols-3 gap-2 mb-2 pb-2" style={{borderBottom: '1px solid var(--border-muted)'}}>
            <div>
              <div className="text-xs text-center mb-1" style={{color: 'var(--text-muted)'}}>TOFU</div>
              <div className="text-xs font-bold text-center mb-1" style={{color: 'var(--text-primary)'}}>{bundle.tofuScore?.toFixed(1) || '0.0'}</div>
              <div className="w-full h-1 rounded-full" style={{background: 'var(--bg-card)'}}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(Math.abs(bundle.tofuScore || 0) * 20, 100)}%`,
                    background: (bundle.tofuScore || 0) >= 0 ? '#22c55e' : '#ef4444'
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-center mb-1" style={{color: 'var(--text-muted)'}}>MOFU</div>
              <div className="text-xs font-bold text-center mb-1" style={{color: 'var(--text-primary)'}}>{bundle.mofuScore?.toFixed(1) || '0.0'}</div>
              <div className="w-full h-1 rounded-full" style={{background: 'var(--bg-card)'}}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(Math.abs(bundle.mofuScore || 0) * 20, 100)}%`,
                    background: (bundle.mofuScore || 0) >= 0 ? '#22c55e' : '#ef4444'
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-center mb-1" style={{color: 'var(--text-muted)'}}>BOFU</div>
              <div className="text-xs font-bold text-center mb-1" style={{color: 'var(--text-primary)'}}>{bundle.bofuScore?.toFixed(1) || '0.0'}</div>
              <div className="w-full h-1 rounded-full" style={{background: 'var(--bg-card)'}}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(Math.abs(bundle.bofuScore || 0) * 20, 100)}%`,
                    background: (bundle.bofuScore || 0) >= 0 ? '#22c55e' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {bundle.clicks !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>Clicks: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{bundle.clicks.toLocaleString()}</span>
              </div>
            )}
            {bundle.cpc !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>CPC: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{formatCurrency(bundle.cpc, 2)}</span>
              </div>
            )}
            {bundle.ctr !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>CTR: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{bundle.ctr.toFixed(1)}%</span>
              </div>
            )}
            {bundle.roas !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>ROAS: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{bundle.roas.toFixed(2)}x</span>
              </div>
            )}
            {bundle.revenue !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>Revenue: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{formatCurrency(bundle.revenue, 0)}</span>
              </div>
            )}
            {bundle.purchases !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>Purchases: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{bundle.purchases}</span>
              </div>
            )}
            {bundle.conversionRate !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>Conv: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{bundle.conversionRate.toFixed(1)}%</span>
              </div>
            )}
            {bundle.cpa !== undefined && (
              <div>
                <span style={{color: 'var(--text-muted)'}}>CPA: </span>
                <span style={{color: 'var(--text-primary)'}} className="font-medium">{formatCurrency(bundle.cpa, 2)}</span>
              </div>
            )}
            <div className="col-span-2">
              <span style={{color: 'var(--text-muted)'}}>Spend: </span>
              <span style={{color: 'var(--text-primary)'}} className="font-medium">{formatCurrency(bundle.spend, 0)}</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>Funnel Optimization</h2>
            <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
              All-Star Ad Bundles by Optimization Goal
            </p>
          </div>

          {/* Country Selector */}
          <div className="flex gap-2">
            {countries.map((country) => (
              <button
                key={country}
                onClick={() => setFunnelCountry(country)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: funnelCountry === country ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: funnelCountry === country ? 'white' : 'var(--text-secondary)'
                }}
              >
                {country === 'United States' ? 'USA' : country === 'United Kingdom' ? 'UK' : country}
              </button>
            ))}
          </div>
        </div>

        {/* All-Stars Section (Full Width) */}
        {(() => {
          const allStarsConfig = goalConfigs.find(c => c.key === 'allstars');
          const allStarsBundles = funnelData['allstars'] || [];

          // Group bundles by recommended stage
          const tofuBundles = allStarsBundles.filter((b: any) => b.recommendedStage === 'TOFU');
          const mofuBundles = allStarsBundles.filter((b: any) => b.recommendedStage === 'MOFU');
          const bofuBundles = allStarsBundles.filter((b: any) => b.recommendedStage === 'BOFU');

          return (
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>{allStarsConfig?.title}</h3>
              <p className="text-xs mb-4" style={{color: 'var(--text-secondary)'}}>{allStarsConfig?.subtitle}</p>
              {allStarsBundles.length > 0 ? (
                <div className="space-y-6">
                  {/* TOFU Section */}
                  {tofuBundles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3" style={{color: 'var(--text-muted)'}}>
                        TOFU
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {tofuBundles.slice(0, 3).map((bundle: any, idx: number) => renderBundleCard(bundle, idx + 1))}
                      </div>
                    </div>
                  )}

                  {/* MOFU Section */}
                  {mofuBundles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3" style={{color: 'var(--text-muted)'}}>
                        MOFU
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {mofuBundles.slice(0, 3).map((bundle: any, idx: number) => renderBundleCard(bundle, idx + 1))}
                      </div>
                    </div>
                  )}

                  {/* BOFU Section */}
                  {bofuBundles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3" style={{color: 'var(--text-muted)'}}>
                        BOFU
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {bofuBundles.slice(0, 3).map((bundle: any, idx: number) => renderBundleCard(bundle, idx + 1))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm" style={{color: 'var(--text-muted)'}}>No ads found</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Other Goals in One Row */}
        <div className="grid grid-cols-6 gap-6">
          {goalConfigs.filter(c => c.key !== 'allstars').map((config) => {
            const bundles = funnelData[config.key] || [];
            return (
              <div key={config.key} className="card p-6">
                <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>{config.title}</h3>
                <p className="text-xs mb-4" style={{color: 'var(--text-secondary)'}}>{config.subtitle}</p>
                {bundles.length > 0 ? (
                  <div>
                    {bundles.slice(0, 3).map((bundle: any, idx: number) => renderBundleCard(bundle, idx + 1))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{color: 'var(--text-muted)'}}>No ads found</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Funnel Stage Distribution Card */}
        {(() => {
          const allStarsBundles = funnelData['allstars'] || [];

          // Count by recommended stage (AI inferred)
          const recommendedTofu = allStarsBundles.filter((b: any) => b.recommendedStage === 'TOFU').length;
          const recommendedMofu = allStarsBundles.filter((b: any) => b.recommendedStage === 'MOFU').length;
          const recommendedBofu = allStarsBundles.filter((b: any) => b.recommendedStage === 'BOFU').length;

          // Count by current stage (from ad names)
          const currentTofu = allStarsBundles.filter((b: any) => b.currentStage === 'TOFU').length;
          const currentMofu = allStarsBundles.filter((b: any) => b.currentStage === 'MOFU').length;
          const currentBofu = allStarsBundles.filter((b: any) => b.currentStage === 'BOFU').length;

          return (
            <div className="card p-6">
              <h3 className="text-sm font-medium mb-4" style={{color: 'var(--text-muted)'}}>FUNNEL STAGE DISTRIBUTION</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* Current Stage (from names) */}
                <div>
                  <div className="text-xs mb-3" style={{color: 'var(--text-secondary)'}}>CURRENT STAGE (FROM NAMES)</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>TOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{currentTofu}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>MOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{currentMofu}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>BOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{currentBofu}</span>
                    </div>
                  </div>
                </div>

                {/* Recommended Stage (AI inferred) */}
                <div>
                  <div className="text-xs mb-3" style={{color: 'var(--text-secondary)'}}>RECOMMENDED STAGE (AI INFERRED)</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>TOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{recommendedTofu}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>MOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{recommendedMofu}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>BOFU</span>
                      <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{recommendedBofu}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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

        {/* Campaigns - Key Metrics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Campaigns - Key Metrics</h3>
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

    const behavioralSegments = customerData.audienceOverlap?.filter((item: any) => item.analysisType === 'Behavioral Analysis') || [];
    const demographicSegments = customerData.audienceOverlap?.filter((item: any) => item.analysisType.includes('Demographic')) || [];

    return (
      <div className="space-y-8">
        {/* Section 1: Customer Overview KPIs */}
        {customerData.overviewKPIs && (
          <div>
            <h2 className="text-xl font-bold mb-6" style={{color: 'var(--text-primary)'}}>Customer Overview</h2>
            <CustomerOverviewKPIs data={customerData.overviewKPIs} />
          </div>
        )}

        {/* Section 4: LTV Intelligence */}
        {customerData.ltvIntelligence && (
          <LTVIntelligence data={customerData.ltvIntelligence} />
        )}

        {/* Section 5: Customer Journey Analysis */}
        {customerData.journeyAnalysis && customerData.journeyAnalysis.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6" style={{color: 'var(--text-primary)'}}>Customer Journey Analysis</h2>
            <CustomerJourneyAnalysis data={customerData.journeyAnalysis} />
          </div>
        )}

        {/* CLV & Churn Risk Dashboard */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-8" style={{color: 'var(--text-primary)'}}>CLV & Churn Risk Dashboard</h3>
          <CustomerCLVDashboard data={customerData.clvData} />
        </div>

        {/* Audience Overlap Analysis */}
        {customerData.audienceOverlap && customerData.audienceOverlap.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>Cross-Platform Audience Overlap Analysis</h2>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Behavioral Segments Overview */}
              {behavioralSegments.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Behavioral Segments</h3>
                  <div className="space-y-4">
                    {behavioralSegments.map((segment: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium" style={{color: 'var(--text-primary)'}}>{segment.segment}</span>
                          <span className="text-sm" style={{color: 'var(--text-muted)'}}>{segment.segmentSize} customers</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              background: segment.overlapEfficiency.includes('Positive') ? 'rgba(34, 197, 94, 0.1)' : segment.overlapEfficiency.includes('Negative') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(137, 205, 238, 0.1)',
                              color: segment.overlapEfficiency.includes('Positive') ? '#22c55e' : segment.overlapEfficiency.includes('Negative') ? '#ef4444' : 'var(--accent-primary)'
                            }}
                          >
                            {segment.overlapEfficiency}
                          </span>
                        </div>
                        <div className="text-xs p-2 rounded" style={{backgroundColor: 'rgba(137, 205, 238, 0.1)', color: 'var(--text-secondary)'}}>
                          💡 {segment.strategicRecommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Insights */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Strategic Insights</h3>
                <div className="space-y-4">
                  {behavioralSegments.length > 0 && (
                    <>
                      <div>
                        <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>PLATFORM PERFORMANCE</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Facebook ROAS</div>
                            <div className="text-2xl font-bold" style={{color: '#1877F2'}}>{behavioralSegments[0]?.facebookRoas.toFixed(2)}x</div>
                          </div>
                          <div>
                            <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Google ROAS</div>
                            <div className="text-2xl font-bold" style={{color: '#4285F4'}}>{behavioralSegments[0]?.googleRoas.toFixed(2)}x</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CORRELATION METRICS</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{color: 'var(--text-muted)'}}>Spend Correlation</span>
                            <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{(behavioralSegments[0]?.spendCorrelation * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{color: 'var(--text-muted)'}}>Revenue Correlation</span>
                            <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{(behavioralSegments[0]?.revenueCorrelation * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{color: 'var(--text-muted)'}}>Engagement Correlation</span>
                            <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{(behavioralSegments[0]?.engagementCorrelation * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Behavioral Segments Table */}
            {behavioralSegments.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Behavioral Segment Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                        <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Segment</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Size</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>FB Spend</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Google Spend</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>FB ROAS</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Google ROAS</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Combined ROAS</th>
                        <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behavioralSegments.map((segment: any, idx: number) => (
                        <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>{segment.segment}</td>
                          <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>{segment.segmentSize}</td>
                          <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>${segment.facebookSpend.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>${segment.googleSpend.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right" style={{color: '#1877F2'}}>{segment.facebookRoas.toFixed(2)}x</td>
                          <td className="py-3 px-2 text-right" style={{color: '#4285F4'}}>{segment.googleRoas.toFixed(2)}x</td>
                          <td className="py-3 px-2 text-right font-semibold" style={{color: 'var(--text-primary)'}}>{segment.combinedRoas.toFixed(2)}x</td>
                          <td className="py-3 px-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                background: segment.overlapEfficiency.includes('Positive') ? 'rgba(34, 197, 94, 0.1)' : segment.overlapEfficiency.includes('Negative') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(137, 205, 238, 0.1)',
                                color: segment.overlapEfficiency.includes('Positive') ? '#22c55e' : segment.overlapEfficiency.includes('Negative') ? '#ef4444' : 'var(--accent-primary)'
                              }}
                            >
                              {segment.overlapEfficiency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Demographic Segments Table */}
            {demographicSegments.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Demographic Segment Analysis</h3>
                  <span className="px-3 py-1 rounded text-xs font-medium" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>
                    ⚠️ Limited Data - 40% Coverage
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                        <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Segment</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>FB ROAS</th>
                        <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Opportunity Score</th>
                        <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Status</th>
                        <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographicSegments.map((segment: any, idx: number) => (
                        <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                          <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>{segment.segment}</td>
                          <td className="py-3 px-2 text-right" style={{color: '#1877F2'}}>{segment.facebookRoas.toFixed(2)}x</td>
                          <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>{segment.marketOpportunityScore.toFixed(1)}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-1 rounded text-xs font-medium" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>
                              {segment.overlapEfficiency}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                            {segment.strategicRecommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Platform section
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
            currentValue={formatCurrency(facebookData.spend.current)}
            previousValue={formatCurrency(facebookData.spend.previous)}
            trend={facebookData.spend.change}
            periodData={{
              sevenDay: {
                value: formatCurrency(facebookData.trailing7d.spend),
                trend: facebookData.trailing7d.spendChange
              },
              thirtyDay: {
                value: formatCurrency(facebookData.trailing30d.spend),
                trend: facebookData.trailing30d.spendChange
              }
            }}
            gaugeValue={facebookData.spend.current}
            gaugeMax={facebookData.spend.current * 1.5}
            gaugeLabel="Spend"
            status={facebookData.spend.change > 10 ? 'warning' : 'good'}
            dateRange={dateRange}
          />

          {/* Facebook Revenue */}
          <KPICard
            title="Facebook Revenue"
            currentValue={formatCurrency(facebookData.revenue.current)}
            previousValue={formatCurrency(facebookData.revenue.previous)}
            trend={facebookData.revenue.change}
            periodData={{
              sevenDay: {
                value: formatCurrency(facebookData.trailing7d.revenue),
                trend: facebookData.trailing7d.revenueChange
              },
              thirtyDay: {
                value: formatCurrency(facebookData.trailing30d.revenue),
                trend: facebookData.trailing30d.revenueChange
              }
            }}
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
            periodData={{
              sevenDay: {
                value: `${facebookData.trailing7d.roas.toFixed(2)}x`,
                trend: facebookData.trailing7d.roasChange
              },
              thirtyDay: {
                value: `${facebookData.trailing30d.roas.toFixed(2)}x`,
                trend: facebookData.trailing30d.roasChange
              }
            }}
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
            currentValue={formatNumber(facebookData.impressions.current, 0)}
            previousValue={formatNumber(facebookData.impressions.previous, 0)}
            trend={facebookData.impressions.change}
            periodData={{
              sevenDay: {
                value: formatNumber(facebookData.trailing7d.impressions, 0),
                trend: facebookData.trailing7d.impressionsChange
              },
              thirtyDay: {
                value: formatNumber(facebookData.trailing30d.impressions, 0),
                trend: facebookData.trailing30d.impressionsChange
              }
            }}
            gaugeValue={facebookData.impressions.current}
            gaugeMax={facebookData.impressions.current * 1.5}
            gaugeLabel="Impressions"
            status={facebookData.impressions.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />

          {/* Facebook Clicks */}
          <KPICard
            title="Facebook Clicks"
            currentValue={formatNumber(facebookData.clicks.current, 0)}
            previousValue={formatNumber(facebookData.clicks.previous, 0)}
            trend={facebookData.clicks.change}
            periodData={{
              sevenDay: {
                value: formatNumber(facebookData.trailing7d.clicks, 0),
                trend: facebookData.trailing7d.clicksChange
              },
              thirtyDay: {
                value: formatNumber(facebookData.trailing30d.clicks, 0),
                trend: facebookData.trailing30d.clicksChange
              }
            }}
            gaugeValue={facebookData.clicks.current}
            gaugeMax={facebookData.clicks.current * 1.5}
            gaugeLabel="Clicks"
            status={facebookData.clicks.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />
        </div>

        {/* Efficiency Metrics Row with Meta ROAS Predictions */}
        <div className="grid grid-cols-4 gap-6">
          {/* Efficiency Metrics - 3/4 width */}
          <div className="col-span-3 card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Efficiency Metrics</h3>
            <div className="grid grid-cols-5 gap-6">
              {/* CTR */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CTR (Click-Through Rate)</div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{facebookData.ctr.current}%</div>
                <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                  Previous: {facebookData.ctr.previous}%
                </div>
                <div className={`text-sm font-semibold mt-1 ${facebookData.ctr.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {facebookData.ctr.change >= 0 ? '↑' : '↓'} {Math.abs(facebookData.ctr.change).toFixed(1)}%
                </div>
              </div>

              {/* Conversion Rate */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Conversion Rate</div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{facebookData.conversionRate.current}%</div>
                <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                  Previous: {facebookData.conversionRate.previous}%
                </div>
                <div className={`text-sm font-semibold mt-1 ${facebookData.conversionRate.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {facebookData.conversionRate.change >= 0 ? '↑' : '↓'} {Math.abs(facebookData.conversionRate.change).toFixed(1)}%
                </div>
              </div>

              {/* CPA */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPA (Cost/Conversion)</div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{facebookData.cpa.current.toFixed(2)}</div>
                <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                  Previous: {currencySymbol}{facebookData.cpa.previous.toFixed(2)}
                </div>
                <div className={`text-sm font-semibold mt-1 ${facebookData.cpa.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {facebookData.cpa.change <= 0 ? '↓' : '↑'} {Math.abs(facebookData.cpa.change).toFixed(1)}%
                </div>
              </div>

              {/* CPC */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPC (Cost per Click)</div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{facebookData.cpc.current.toFixed(2)}</div>
                <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                  Previous: {currencySymbol}{facebookData.cpc.previous.toFixed(2)}
                </div>
                <div className={`text-sm font-semibold mt-1 ${facebookData.cpc.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {facebookData.cpc.change <= 0 ? '↓' : '↑'} {Math.abs(facebookData.cpc.change).toFixed(1)}%
                </div>
              </div>

              {/* CPM */}
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPM (Cost per 1K Impr.)</div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{facebookData.cpm.current.toFixed(2)}</div>
                <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                  Previous: {currencySymbol}{facebookData.cpm.previous.toFixed(2)}
                </div>
                <div className={`text-sm font-semibold mt-1 ${facebookData.cpm.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {facebookData.cpm.change <= 0 ? '↓' : '↑'} {Math.abs(facebookData.cpm.change).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Meta ROAS Predictions - 1/4 width */}
          {metaRoasPredictions && !metaRoasLoading && (
            <div className="col-span-1 card p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                  META ROAS PREDICTION
                </h3>
                <span className="text-xs px-2 py-1 rounded" style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)'
                }}>
                  {metaRoasPredictions.predictionMethod}
                </span>
              </div>

              {/* Main Prediction Value */}
              <div className="space-y-3">
                <div className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {metaRoasPredictions.predictedMetaRoas.toFixed(2)}x
                </div>

                {/* Range */}
                <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Range: {metaRoasPredictions.lowerBound.toFixed(2)}x - {metaRoasPredictions.upperBound.toFixed(2)}x
                </div>
              </div>

              {/* Visual Bar for Range */}
              <div className="space-y-2">
                <div className="relative h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                  {/* Lower to Upper Range */}
                  <div
                    className="absolute h-3 rounded-full"
                    style={{
                      left: `${(metaRoasPredictions.lowerBound / metaRoasPredictions.upperBound) * 100}%`,
                      right: '0%',
                      background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                      opacity: 0.3
                    }}
                  />
                  {/* Predicted Point */}
                  <div
                    className="absolute h-3 w-1 rounded-full"
                    style={{
                      left: `${(metaRoasPredictions.predictedMetaRoas / metaRoasPredictions.upperBound) * 100}%`,
                      background: 'var(--accent-primary)',
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>

                {/* Labels */}
                <div className="flex justify-between text-xs" style={{color: 'var(--text-muted)'}}>
                  <span>{metaRoasPredictions.lowerBound.toFixed(2)}x</span>
                  <span>{metaRoasPredictions.upperBound.toFixed(2)}x</span>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Country Performance */}
        {facebookData?.countryPerformance && facebookData.countryPerformance.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Performance by Country</h3>
            <div className="grid grid-cols-3 gap-4">
              {facebookData.countryPerformance.slice(0, 3).map((country: any, idx: number) => (
                <div key={idx} className="card p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium" style={{color: 'var(--text-muted)'}}>
                      {country.country}
                    </h3>

                    <div className="space-y-3">
                      {/* Revenue */}
                      <div>
                        <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Revenue</div>
                        <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                          {formatCurrency(country.revenue)}
                        </div>
                        <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                          vs {formatCurrency(country.previousRevenue)}
                        </div>
                        <div className={`text-sm font-semibold ${country.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {country.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(country.revenueChange).toFixed(1)}%
                        </div>
                      </div>

                      {/* ROAS */}
                      <div>
                        <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>ROAS</div>
                        <div className="text-xl font-bold" style={{color: country.roas >= roasTarget ? 'var(--color-success)' : 'var(--text-primary)'}}>
                          {country.roas.toFixed(2)}x
                        </div>
                        <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                          vs {country.previousRoas.toFixed(2)}x
                        </div>
                      </div>

                      {/* Spend & Purchases */}
                      <div className="grid grid-cols-2 gap-3 pt-2" style={{borderTop: '1px solid var(--border-muted)'}}>
                        <div>
                          <div className="text-xs" style={{color: 'var(--text-muted)'}}>Spend</div>
                          <div className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                            {formatCurrency(country.spend)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs" style={{color: 'var(--text-muted)'}}>Purchases</div>
                          <div className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                            {country.purchases.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Trailing periods */}
                      <div className="text-xs pt-2" style={{borderTop: '1px solid var(--border-muted)', color: 'var(--text-muted)'}}>
                        <div className="flex justify-between mb-1">
                          <span>7d:</span>
                          <span>{formatCurrency(country.trailing7d.revenue)} ({country.trailing7d.roas.toFixed(2)}x)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>30d:</span>
                          <span>{formatCurrency(country.trailing30d.revenue)} ({country.trailing30d.roas.toFixed(2)}x)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Chart */}
        <ChartCard
          title={`Facebook Revenue - Current vs ${facebookComparisonType === 'previous-year' ? 'Last Year' : 'Previous Period'}`}
          type="line"
          dateRange={dateRange}
          data={facebookData.dailyMetrics}
        />

        {/* Campaigns Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top Campaigns by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Campaign</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Spend</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Purchases</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>ROAS</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Clicks</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Impressions</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Reach</th>
                </tr>
              </thead>
              <tbody>
                {facebookData.campaigns.map((campaign: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2">
                      <a
                        href={`/campaign/${encodeURIComponent(campaign.campaignName)}`}
                        className="hover:underline"
                        style={{color: 'var(--accent-primary)'}}
                      >
                        {campaign.campaignName}
                      </a>
                    </td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(campaign.spend)}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(campaign.purchaseValue)}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.purchases.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: campaign.roas >= roasTarget ? 'var(--color-success)' : 'var(--text-primary)'}}>{campaign.roas.toFixed(2)}x</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatNumber(campaign.clicks, 0)}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatNumber(campaign.impressions, 0)}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatNumber(campaign.reach, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ads Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top Ads by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Campaign</th>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Ad Set</th>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Ad</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Spend</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>ROAS</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Purchases</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {facebookData.ads.map((ad: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{ad.campaignName}</td>
                    <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{ad.adsetName}</td>
                    <td className="py-3 px-2">
                      <a
                        href={`/ad/${encodeURIComponent(ad.adName)}?adset=${encodeURIComponent(ad.adsetName)}&preset=${facebookDatePreset}`}
                        className="hover:underline"
                        style={{color: 'var(--accent-primary)'}}
                      >
                        {ad.adName}
                      </a>
                    </td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(ad.spend)}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(ad.revenue)}</td>
                    <td className="text-right py-3 px-2" style={{color: ad.roas >= roasTarget ? 'var(--color-success)' : 'var(--text-primary)'}}>{ad.roas.toFixed(2)}x</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{ad.purchases.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{ad.ctr.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                          <span style={{color: 'var(--text-primary)'}}>{currencySymbol}{product.revenue.toLocaleString()}</span>
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
          <div className="mt-4 text-xs" style={{color: 'var(--text-muted)', opacity: 0.8}}>
            40% Revenue Score - Business impact. 25% Velocity Score - Sales momentum. 20% Growth Score - Trajectory. 15% Margin Score - Profitability proxy
          </div>
        </div>

        {/* Grip Customer Behavior Analysis - 2/3 and 1/3 split (JumboMax only) */}
        {currentClient !== 'puttout' && currentClient !== 'hb' && <div className="grid grid-cols-3 gap-6">
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
        </div>}

        {/* Putter Grip Switching & Loyalty Patterns (JumboMax only) */}
        {currentClient !== 'puttout' && currentClient !== 'hb' && <div className="card p-6">
          <h3 className="text-lg font-semibold mb-8" style={{color: 'var(--text-primary)'}}>Putter Grip Switching & Loyalty Patterns</h3>
          <PutterGripSwitchingSankey data={productData.putterGripSwitching || []} />
        </div>}

        {/* Product Affinity - Three columns */}
        <div className="grid grid-cols-3 gap-6">
          {/* Product Rankings */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top Products by Revenue</h3>
            <ProductRankings data={productData.rankings} />
            <div className="mt-4 text-xs" style={{color: 'var(--text-muted)', opacity: 0.8}}>
              Rolling 30-Day Period
            </div>
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
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{currencySymbol}{geo.revenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{geo.units.toLocaleString()}</td>
                      <td className="py-3 px-2" style={{color: 'var(--text-secondary)'}}>{geo.topProduct}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{currencySymbol}{geo.topProductRevenue.toLocaleString()}</td>
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

  // Google Ads section
  if (section === 'google') {
    // Show loading state
    if (googleLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading Google Ads data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (googleError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{googleError}</p>
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

    // Show Google dashboard
    if (!googleData) {
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
          <DateFilter onDateChange={handleGoogleDateChange} value={googleDatePreset} />
          <ComparisonSelector onComparisonChange={handleGoogleComparisonChange} value={googleComparisonType} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          {/* Google Spend */}
          <KPICard
            title="Google Spend"
            currentValue={formatCurrency(googleData.spend.current)}
            previousValue={formatCurrency(googleData.spend.previous)}
            trend={googleData.spend.change}
            periodData={{
              sevenDay: {
                value: formatCurrency(googleData.trailing7d.spend),
                trend: googleData.trailing7d.spendChange
              },
              thirtyDay: {
                value: formatCurrency(googleData.trailing30d.spend),
                trend: googleData.trailing30d.spendChange
              }
            }}
            gaugeValue={googleData.spend.current}
            gaugeMax={googleData.spend.current * 1.5}
            gaugeLabel="Spend"
            status={googleData.spend.change > 10 ? 'warning' : 'good'}
            dateRange={dateRange}
          />

          {/* Google Revenue */}
          <KPICard
            title="Google Revenue"
            currentValue={formatCurrency(googleData.revenue.current)}
            previousValue={formatCurrency(googleData.revenue.previous)}
            trend={googleData.revenue.change}
            periodData={{
              sevenDay: {
                value: formatCurrency(googleData.trailing7d.revenue),
                trend: googleData.trailing7d.revenueChange
              },
              thirtyDay: {
                value: formatCurrency(googleData.trailing30d.revenue),
                trend: googleData.trailing30d.revenueChange
              }
            }}
            gaugeValue={googleData.revenue.current}
            gaugeMax={googleData.revenue.current * 1.5}
            gaugeLabel="Revenue"
            status={googleData.revenue.change > 0 ? 'excellent' : 'warning'}
            dateRange={dateRange}
          />

          {/* Google ROAS */}
          <KPICard
            title="Google ROAS"
            currentValue={`${googleData.roas.current.toFixed(2)}x`}
            previousValue={`${googleData.roas.previous.toFixed(2)}x`}
            trend={googleData.roas.change}
            periodData={{
              sevenDay: {
                value: `${googleData.trailing7d.roas.toFixed(2)}x`,
                trend: googleData.trailing7d.roasChange
              },
              thirtyDay: {
                value: `${googleData.trailing30d.roas.toFixed(2)}x`,
                trend: googleData.trailing30d.roasChange
              }
            }}
            gaugeValue={googleData.roas.current}
            gaugeTarget={roasTarget}
            gaugeMax={roasTarget * 2}
            gaugeLabel={`Target: ${roasTarget}x`}
            status={googleData.roas.current >= roasTarget ? 'excellent' : googleData.roas.current >= roasTarget * 0.8 ? 'good' : 'warning'}
            dateRange={dateRange}
          />

          {/* Google Impressions */}
          <KPICard
            title="Google Impressions"
            currentValue={formatNumber(googleData.impressions.current, 0)}
            previousValue={formatNumber(googleData.impressions.previous, 0)}
            trend={googleData.impressions.change}
            periodData={{
              sevenDay: {
                value: formatNumber(googleData.trailing7d.impressions, 0),
                trend: googleData.trailing7d.impressionsChange
              },
              thirtyDay: {
                value: formatNumber(googleData.trailing30d.impressions, 0),
                trend: googleData.trailing30d.impressionsChange
              }
            }}
            gaugeValue={googleData.impressions.current}
            gaugeMax={googleData.impressions.current * 1.5}
            gaugeLabel="Impressions"
            status={googleData.impressions.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />

          {/* Google Clicks */}
          <KPICard
            title="Google Clicks"
            currentValue={formatNumber(googleData.clicks.current, 0)}
            previousValue={formatNumber(googleData.clicks.previous, 0)}
            trend={googleData.clicks.change}
            periodData={{
              sevenDay: {
                value: formatNumber(googleData.trailing7d.clicks, 0),
                trend: googleData.trailing7d.clicksChange
              },
              thirtyDay: {
                value: formatNumber(googleData.trailing30d.clicks, 0),
                trend: googleData.trailing30d.clicksChange
              }
            }}
            gaugeValue={googleData.clicks.current}
            gaugeMax={googleData.clicks.current * 1.5}
            gaugeLabel="Clicks"
            status={googleData.clicks.change > 0 ? 'good' : 'monitor'}
            dateRange={dateRange}
          />
        </div>

        {/* Efficiency Metrics Row */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Efficiency Metrics</h3>
          <div className="grid grid-cols-5 gap-6">
            {/* CTR */}
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CTR (Click-Through Rate)</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{googleData.ctr.current}%</div>
              <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                Previous: {googleData.ctr.previous}%
              </div>
              <div className={`text-sm font-semibold mt-1 ${googleData.ctr.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {googleData.ctr.change >= 0 ? '↑' : '↓'} {Math.abs(googleData.ctr.change).toFixed(1)}%
              </div>
            </div>

            {/* Conversion Rate */}
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>Conversion Rate</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{googleData.conversionRate.current}%</div>
              <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                Previous: {googleData.conversionRate.previous}%
              </div>
              <div className={`text-sm font-semibold mt-1 ${googleData.conversionRate.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {googleData.conversionRate.change >= 0 ? '↑' : '↓'} {Math.abs(googleData.conversionRate.change).toFixed(1)}%
              </div>
            </div>

            {/* CPA */}
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPA (Cost/Conversion)</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{googleData.cpa.current.toFixed(2)}</div>
              <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                Previous: {currencySymbol}{googleData.cpa.previous.toFixed(2)}
              </div>
              <div className={`text-sm font-semibold mt-1 ${googleData.cpa.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {googleData.cpa.change <= 0 ? '↓' : '↑'} {Math.abs(googleData.cpa.change).toFixed(1)}%
              </div>
            </div>

            {/* CPC */}
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPC (Cost per Click)</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{googleData.cpc.current.toFixed(2)}</div>
              <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                Previous: {currencySymbol}{googleData.cpc.previous.toFixed(2)}
              </div>
              <div className={`text-sm font-semibold mt-1 ${googleData.cpc.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {googleData.cpc.change <= 0 ? '↓' : '↑'} {Math.abs(googleData.cpc.change).toFixed(1)}%
              </div>
            </div>

            {/* CPM */}
            <div>
              <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>CPM (Cost per 1K Impr.)</div>
              <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{currencySymbol}{googleData.cpm.current.toFixed(2)}</div>
              <div className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                Previous: {currencySymbol}{googleData.cpm.previous.toFixed(2)}
              </div>
              <div className={`text-sm font-semibold mt-1 ${googleData.cpm.change <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {googleData.cpm.change <= 0 ? '↓' : '↑'} {Math.abs(googleData.cpm.change).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <ChartCard
          title={`Google Revenue - Current vs ${googleComparisonType === 'previous-year' ? 'Last Year' : 'Previous Period'}`}
          type="line"
          dateRange={dateRange}
          data={googleData.dailyMetrics}
        />

        {/* Campaigns Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>Top Campaigns by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                  <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Campaign</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Spend</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Purchases</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>ROAS</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Clicks</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Impressions</th>
                  <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Reach</th>
                </tr>
              </thead>
              <tbody>
                {googleData.campaigns.map((campaign: any, idx: number) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <td className="py-3 px-2">
                      <a
                        href={`/campaign/${encodeURIComponent(campaign.campaignName)}`}
                        className="hover:underline"
                        style={{color: 'var(--text-primary)'}}
                      >
                        {campaign.campaignName}
                      </a>
                    </td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${campaign.spend.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>${campaign.purchaseValue.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.purchases.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{campaign.roas.toFixed(2)}x</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-secondary)'}}>{campaign.clicks.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-secondary)'}}>{campaign.impressions.toLocaleString()}</td>
                    <td className="text-right py-3 px-2" style={{color: 'var(--text-secondary)'}}>{campaign.reach.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Operational section
  if (section === 'operational') {
    // Show loading state
    if (operationalLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading operational data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (operationalError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{operationalError}</p>
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

    // Show operational data
    if (!operationalData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No operational data available</p>
        </div>
      );
    }

    const putterGrips = operationalData.putterGripPricing || [];
    const swingGrips = operationalData.swingGripPricing || [];

    // Function to calculate elasticity-based projections
    const calculateProjection = (item: any, testPrice: number, itemType: 'swing' | 'putter') => {
      const currentPrice = itemType === 'swing' ? item.currentUnitPrice : item.currentAvgPrice;
      const currentUnits = itemType === 'swing' ? item.totalIndividualUnits : item.currentUnitsSold;
      const currentRevenue = itemType === 'swing' ? item.currentRevenue : item.currentRevenue;

      // Calculate price change percentage
      const priceChangePct = ((testPrice - currentPrice) / currentPrice) * 100;

      // Calculate elasticity from the original data
      // Elasticity = (% change in quantity) / (% change in price)
      const originalPriceChangePct = item.priceChangePct || 0;
      const originalDemandChangePct = item.demandChangePct || 0;

      let elasticity = -1.5; // default fallback
      if (originalPriceChangePct !== 0) {
        elasticity = originalDemandChangePct / originalPriceChangePct;
      }

      // Calculate demand change based on derived elasticity
      const demandChangePct = elasticity * priceChangePct;

      // Calculate new units
      const newUnits = currentUnits * (1 + demandChangePct / 100);

      // Calculate new revenue
      const newRevenue = testPrice * newUnits;

      // Calculate revenue change
      const revenueChange = newRevenue - currentRevenue;
      const revenueChangePct = (revenueChange / currentRevenue) * 100;

      return {
        priceChangePct,
        demandChangePct,
        projectedUnits: newUnits,
        projectedRevenue: newRevenue,
        revenueChange,
        revenueChangePct
      };
    };

    // Calculate summary metrics
    const totalPutterRevenuePotential = putterGrips.reduce((sum: number, item: any) => sum + (item.revenueChangeWithElasticity || 0), 0);
    const totalSwingRevenuePotential = swingGrips.reduce((sum: number, item: any) => sum + (item.revenueChangeWithElasticity || 0), 0);
    const totalRevenuePotential = totalPutterRevenuePotential + totalSwingRevenuePotential;
    const avgPutterPriceChange = putterGrips.length > 0
      ? putterGrips.reduce((sum: number, item: any) => sum + Math.abs(item.priceChangePct || 0), 0) / putterGrips.length
      : 0;
    const avgSwingPriceChange = swingGrips.length > 0
      ? swingGrips.reduce((sum: number, item: any) => sum + Math.abs(item.priceChangePct || 0), 0) / swingGrips.length
      : 0;

    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>Dynamic Pricing Optimization</h2>

        {/* Summary Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>TOTAL REVENUE POTENTIAL</div>
            <div className="text-3xl font-bold" style={{color: totalRevenuePotential >= 0 ? '#22c55e' : '#ef4444'}}>
              {formatCurrency(totalRevenuePotential)}
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-muted)'}}>With elasticity-adjusted pricing</div>
          </div>

          <div className="card p-6">
            <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>PUTTER GRIPS OPPORTUNITY</div>
            <div className="text-3xl font-bold" style={{color: totalPutterRevenuePotential >= 0 ? '#22c55e' : '#ef4444'}}>
              {formatCurrency(totalPutterRevenuePotential)}
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-muted)'}}>Avg price change: {avgPutterPriceChange.toFixed(1)}%</div>
          </div>

          <div className="card p-6">
            <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>SWING GRIPS OPPORTUNITY</div>
            <div className="text-3xl font-bold" style={{color: totalSwingRevenuePotential >= 0 ? '#22c55e' : '#ef4444'}}>
              {formatCurrency(totalSwingRevenuePotential)}
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-muted)'}}>Avg price change: {avgSwingPriceChange.toFixed(1)}%</div>
          </div>

          <div className="card p-6">
            <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>OPTIMIZATION OPPORTUNITIES</div>
            <div className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
              {putterGrips.length + swingGrips.length}
            </div>
            <div className="text-sm mt-2" style={{color: 'var(--text-muted)'}}>Products analyzed</div>
          </div>
        </div>

        {/* Swing Grips Pricing Table */}
        {swingGrips.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Swing Grips Pricing Model</h3>
            <p className="text-sm mb-6" style={{color: 'var(--text-muted)'}}>Test different prices to see real-time revenue impact projections</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Product Line</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Current Price</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Test Price</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Price Change</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Demand Change</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Projected Units</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {swingGrips.map((item: any, idx: number) => {
                    const itemKey = `swing-${idx}`;
                    const testPrice = customPrices[itemKey] || 15.99;
                    const projection = calculateProjection(item, testPrice, 'swing');

                    return (
                      <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                        <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{item.productLine}</td>
                        <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(item.currentUnitPrice)}</td>
                        <td className="text-right py-3 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={testPrice}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || item.currentUnitPrice;
                              setCustomPrices({...customPrices, [itemKey]: newPrice});
                            }}
                            className="w-20 px-2 py-1 text-right rounded border"
                            style={{
                              background: 'var(--card-bg)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-muted)'
                            }}
                          />
                        </td>
                        <td className="text-right py-3 px-2 font-semibold" style={{color: projection.priceChangePct > 0 ? '#22c55e' : projection.priceChangePct < 0 ? '#ef4444' : 'var(--text-primary)'}}>
                          {projection.priceChangePct > 0 ? '+' : ''}{projection.priceChangePct.toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-2 font-semibold" style={{color: projection.demandChangePct > 0 ? '#22c55e' : projection.demandChangePct < 0 ? '#ef4444' : 'var(--text-primary)'}}>
                          {projection.demandChangePct > 0 ? '+' : ''}{projection.demandChangePct.toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>
                          {Math.round(projection.projectedUnits).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2 font-semibold" style={{color: projection.revenueChange >= 0 ? '#22c55e' : '#ef4444'}}>
                          {formatCurrency(projection.revenueChange)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Putter Grips Pricing Table */}
        {putterGrips.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Putter Grips Pricing Model</h3>
            <p className="text-sm mb-6" style={{color: 'var(--text-muted)'}}>Testing a $34.99 Price Point</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-muted)'}}>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Product</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Current Price</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Units Sold</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Price Change</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Demand Change</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Revenue Impact</th>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Risk</th>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {putterGrips.map((item: any, idx: number) => (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                      <td className="py-3 px-2" style={{color: 'var(--text-primary)'}}>{item.title}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{formatCurrency(item.currentAvgPrice)}</td>
                      <td className="text-right py-3 px-2" style={{color: 'var(--text-primary)'}}>{(item.currentUnitsSold || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-2 font-semibold" style={{color: (item.priceChangePct || 0) > 0 ? '#22c55e' : '#ef4444'}}>
                        {(item.priceChangePct || 0) > 0 ? '+' : ''}{(item.priceChangePct || 0).toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-2 font-semibold" style={{color: (item.demandChangePct || 0) > 0 ? '#22c55e' : '#ef4444'}}>
                        {(item.demandChangePct || 0) > 0 ? '+' : ''}{(item.demandChangePct || 0).toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-2 font-semibold" style={{color: (item.revenueChangeWithElasticity || 0) >= 0 ? '#22c55e' : '#ef4444'}}>
                        {formatCurrency(item.revenueChangeWithElasticity)}
                      </td>
                      <td className="py-3 px-2 text-sm" style={{color: 'var(--text-secondary)'}}>{item.riskCategory}</td>
                      <td className="py-3 px-2 text-sm" style={{color: 'var(--text-secondary)'}}>{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Forecasting section
  if (section === 'forecasting') {
    // Show loading state
    if (forecastLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{color: 'var(--accent-primary)'}} />
            <span className="text-lg" style={{color: 'var(--text-secondary)'}}>Loading forecast data...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (forecastError) {
      return (
        <div className="text-center py-12">
          <div className="card p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Error Loading Data</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{forecastError}</p>
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

    if (!forecastData) {
      return (
        <div className="text-center py-12">
          <p style={{color: 'var(--text-muted)'}}>No forecast data available</p>
        </div>
      );
    }

    const bfcmData = forecastData.bfcm;
    const q4Data = forecastData.q4;

    // Historical BFCM data
    const historicalBFCM = [
      { year: 2022, days: 13, totalRevenue: 111814, avgDaily: 8601, minDaily: 5232, maxDaily: 13588, vsNormal: 128.5 },
      { year: 2023, days: 13, totalRevenue: 86820, avgDaily: 6678, minDaily: 1827, maxDaily: 10548, vsNormal: 60.5 },
      { year: 2024, days: 12, totalRevenue: 198702, avgDaily: 16559, minDaily: 8432, maxDaily: 27546, vsNormal: 85.3 }
    ];

    return (
      <div className="space-y-8">
        {/* Forecast Scenario Cards */}
        {bfcmData && q4Data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BFCM 2025 Scenarios */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
                BFCM 2025 Forecast Scenarios
              </h3>
              <div className="space-y-4">
                {Object.entries(bfcmData.scenarios).map(([name, data]: [string, any], index) => {
                  const displayName = name === 'forecast' ? 'Forecast' :
                                    name === 'stretchGoal' ? 'Stretch Goal' :
                                    name.charAt(0).toUpperCase() + name.slice(1);
                  const scenarios = Object.values(bfcmData.scenarios) as any[];
                  const minTotal = Math.min(...scenarios.map((s: any) => s.total));
                  const maxTotal = Math.max(...scenarios.map((s: any) => s.total));
                  // Add minimum 20% width, scale remaining 80%
                  const percentage = 20 + ((data.total - minTotal) / (maxTotal - minTotal)) * 80;

                  const getColor = (name: string) => {
                    if (name === 'conservative') return '#ef4444';
                    if (name === 'forecast') return '#f59e0b';
                    if (name === 'optimistic') return '#22c55e';
                    if (name === 'stretchGoal') return '#10b981';
                    return '#94a3b8';
                  };

                  return (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                          {displayName}
                        </span>
                        <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                          {formatCurrency(data.total, 1)}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                        <div
                          className="h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${getColor(name)}, ${getColor(name)}dd)`
                          }}
                        />
                      </div>
                      <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                        {formatCurrency(data.avg, 1)} / day
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t" style={{borderColor: 'var(--border-muted)'}}>
                <p className="text-xs" style={{color: 'var(--text-muted)'}}>
                  Forecast = Model Prediction. Conservative = -15%. Optimistic = +15%. Stretch Goal = +30%
                </p>
              </div>
            </div>

            {/* Q4 2025 Scenarios */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
                Q4 2025 Forecast Scenarios
              </h3>
              <div className="space-y-4">
                {Object.entries(q4Data.scenarios).map(([name, data]: [string, any], index) => {
                  const displayName = name === 'forecast' ? 'Forecast' :
                                    name === 'stretchGoal' ? 'Stretch Goal' :
                                    name.charAt(0).toUpperCase() + name.slice(1);
                  const scenarios = Object.values(q4Data.scenarios) as any[];
                  const minTotal = Math.min(...scenarios.map((s: any) => s.total));
                  const maxTotal = Math.max(...scenarios.map((s: any) => s.total));
                  // Add minimum 20% width, scale remaining 80%
                  const percentage = 20 + ((data.total - minTotal) / (maxTotal - minTotal)) * 80;

                  const getColor = (name: string) => {
                    if (name === 'conservative') return '#ef4444';
                    if (name === 'forecast') return '#f59e0b';
                    if (name === 'optimistic') return '#22c55e';
                    if (name === 'stretchGoal') return '#10b981';
                    return '#94a3b8';
                  };

                  return (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                          {displayName}
                        </span>
                        <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                          {formatCurrency(data.total, 1)}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full" style={{background: 'var(--border-muted)'}}>
                        <div
                          className="h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${getColor(name)}, ${getColor(name)}dd)`
                          }}
                        />
                      </div>
                      <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                        {formatCurrency(data.avg, 1)} / day
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t" style={{borderColor: 'var(--border-muted)'}}>
                <p className="text-xs" style={{color: 'var(--text-muted)'}}>
                  Forecast = Model Prediction. Conservative = -15%. Optimistic = +15%. Stretch Goal = +30%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Forecast Chart */}
        {forecastData.daily && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
              Q4 2025 Daily Revenue Forecast vs Actual
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    tickFormatter={(value) => {
                      // Parse as local date to avoid timezone issues
                      const [year, month, day] = value.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value, 0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value: number) => formatCurrency(value, 1)}
                    labelFormatter={(label) => {
                      // Parse as local date to avoid timezone issues
                      const [year, month, day] = label.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    }}
                    itemSorter={(item: any) => {
                      // Sort in descending order: actual (highest), optimistic, forecast, conservative (lowest)
                      const order: {[key: string]: number} = { actual: 0, optimistic: 1, forecast: 2, conservative: 3 };
                      return order[item.dataKey] ?? 999;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: 'var(--text-primary)' }}
                    payload={[
                      { value: 'Actual', type: 'line', color: '#89cdee' },
                      { value: 'Optimistic', type: 'line', color: '#9CA3AF' },
                      { value: 'Forecast', type: 'line', color: '#22c55e' },
                      { value: 'Conservative', type: 'line', color: '#6B7280' }
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#89cdee"
                    strokeWidth={3}
                    dot={false}
                    name="Actual"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Optimistic"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#22c55e"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Forecast"
                  />
                  <Line
                    type="monotone"
                    dataKey="conservative"
                    stroke="#6B7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Conservative"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* BFCM Impact Summary */}
        {bfcmData && q4Data && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
              BFCM Impact Analysis (Forecast)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>
                  BFCM Total Revenue
                </div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {formatCurrency(bfcmData.scenarios.forecast.total, 1)}
                </div>
              </div>
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>
                  % of Q4 Revenue
                </div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {((bfcmData.scenarios.forecast.total / q4Data.scenarios.forecast.total) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm mb-2" style={{color: 'var(--text-muted)'}}>
                  BFCM Daily Average
                </div>
                <div className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {formatCurrency(bfcmData.scenarios.forecast.avg, 1)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forecast Summary Table */}
        {forecastData.scenarios && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
              Forecast Summary by Period
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                    <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Period</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Days</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Total Revenue</th>
                    <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Avg Daily</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.scenarios.map((row: any, idx: number) => (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border-muted)'}}>
                      <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>
                        {row.period}
                      </td>
                      <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                        {row.days}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold" style={{color: 'var(--text-primary)'}}>
                        {formatCurrency(row.scenarios.forecast.total, 1)}
                      </td>
                      <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                        {formatCurrency(row.scenarios.forecast.avg, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Historical BFCM Performance Card */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6" style={{color: 'var(--text-primary)'}}>
            Historical BFCM Performance Analysis
          </h3>

          <div className="space-y-6">
            {/* Historical Table */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{color: 'var(--text-muted)'}}>
                BFCM Revenue by Year
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom: '2px solid var(--border-muted)'}}>
                      <th className="text-left py-3 px-2" style={{color: 'var(--text-muted)'}}>Year</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Days</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Total Revenue</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Avg Daily</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Min Daily</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>Max Daily</th>
                      <th className="text-right py-3 px-2" style={{color: 'var(--text-muted)'}}>% vs Normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalBFCM.map((row) => (
                      <tr key={row.year} style={{borderBottom: '1px solid var(--border-muted)'}}>
                        <td className="py-3 px-2 font-medium" style={{color: 'var(--text-primary)'}}>
                          {row.year}
                        </td>
                        <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                          {row.days}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold" style={{color: 'var(--text-primary)'}}>
                          {formatCurrency(row.totalRevenue, 1)}
                        </td>
                        <td className="py-3 px-2 text-right" style={{color: 'var(--text-primary)'}}>
                          {formatCurrency(row.avgDaily, 1)}
                        </td>
                        <td className="py-3 px-2 text-right" style={{color: 'var(--text-secondary)'}}>
                          {formatCurrency(row.minDaily, 1)}
                        </td>
                        <td className="py-3 px-2 text-right" style={{color: 'var(--text-secondary)'}}>
                          {formatCurrency(row.maxDaily, 1)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium" style={{color: 'var(--accent-success)'}}>
                          +{row.vsNormal.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Findings Grid */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{color: 'var(--text-muted)'}}>
                Key Findings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 2024 Baseline */}
                <div className="space-y-3">
                  <div className="text-xs font-medium uppercase" style={{color: 'var(--text-muted)'}}>
                    Current 2024 Baseline (excluding BFCM)
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Last 30 days avg:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>$12.5K/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Last 90 days avg:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>$16.0K/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>2024 YTD avg:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>$12.3K/day</span>
                    </div>
                  </div>
                </div>

                {/* Historical BFCM Lift */}
                <div className="space-y-3">
                  <div className="text-xs font-medium uppercase" style={{color: 'var(--text-muted)'}}>
                    Historical BFCM Lift
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>3-year average:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--accent-success)'}}>+91.4%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Best performance:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--accent-success)'}}>2022 at +128.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Most recent:</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--accent-success)'}}>2024 at +85.3%</span>
                    </div>
                  </div>
                </div>

                {/* Average BFCM Performance */}
                <div className="space-y-3">
                  <div className="text-xs font-medium uppercase" style={{color: 'var(--text-muted)'}}>
                    Average BFCM Performance
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
                      $10.6K
                    </div>
                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      Daily average (2022-2024)
                    </div>
                  </div>
                </div>
              </div>
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