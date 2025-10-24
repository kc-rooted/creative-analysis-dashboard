'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface DashboardData {
  kpis: {
    totalRevenue: any;
    blendedROAS: any;
    emailPerformance?: any;
  };
  charts: {
    paidMediaTrend: any[];
  };
}

function MonthlyReportContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client') || 'jumbomax';
  const period = searchParams.get('period') || 'mtd';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/dashboard?period=${period}`, {
          headers: { 'x-client-id': clientId }
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId, period]);

  if (loading) {
    return <div className="p-8">Loading report...</div>;
  }

  if (!data) {
    return <div className="p-8">No data available</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 2) => {
    return value.toFixed(decimals);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case 'mtd': return 'Month to Date';
      case '30d': return 'Last 30 Days';
      case 'ytd': return 'Year to Date';
      default: return period;
    }
  };

  return (
    <div className="report-container bg-white text-black min-h-screen">
      {/* Report Header */}
      <header className="report-header border-b-4 border-blue-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Performance Report
            </h1>
            <p className="text-xl text-gray-600">
              {clientId.toUpperCase()} • {getPeriodLabel()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Generated: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Report Date</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Executive Summary */}
      <section className="report-section mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-gray-200 pb-2">
          Executive Summary
        </h2>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="kpi-card border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">TOTAL REVENUE</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.value || 0)}
            </div>
            <div className={`text-sm ${(data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0) >= 0 ? '↑' : '↓'} {Math.abs(data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0).toFixed(1)}% YoY
            </div>
          </div>

          {/* Blended ROAS */}
          <div className="kpi-card border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">BLENDED ROAS</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatNumber(data.kpis.blendedROAS.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.value || 0)}x
            </div>
            <div className={`text-sm ${(data.kpis.blendedROAS.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(data.kpis.blendedROAS.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0) >= 0 ? '↑' : '↓'} {Math.abs(data.kpis.blendedROAS.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.trend || 0).toFixed(1)}% YoY
            </div>
          </div>

          {/* Ad Spend */}
          <div className="kpi-card border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">AD SPEND</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(data.kpis.blendedROAS.spend[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate'] || 0)}
            </div>
            <div className="text-sm text-gray-600">
              Paid Media Investment
            </div>
          </div>
        </div>

        {/* Email Performance (if available) */}
        {data.kpis.emailPerformance && (
          <div className="kpi-card border-2 border-blue-100 bg-blue-50 rounded-lg p-6">
            <div className="text-sm font-medium text-blue-900 mb-2">EMAIL REVENUE</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(data.kpis.emailPerformance.periodData[period === 'mtd' ? 'monthToDate' : period === '7d' ? 'sevenDay' : period === '30d' ? 'thirtyDay' : 'yearToDate']?.value || 0)}
            </div>
          </div>
        )}
      </section>

      {/* Key Insights */}
      <section className="report-section mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-gray-200 pb-2">
          Key Insights
        </h2>

        <div className="space-y-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <div className="font-semibold text-green-900">Strong Performance</div>
            <p className="text-green-800 mt-1">
              Revenue trending {data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : 'sevenDay'].trend >= 0 ? 'up' : 'down'} with {formatNumber(Math.abs(data.kpis.totalRevenue.periodData[period === 'mtd' ? 'monthToDate' : 'sevenDay'].trend))}% YoY growth
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <div className="font-semibold text-blue-900">ROAS Efficiency</div>
            <p className="text-blue-800 mt-1">
              Current ROAS of {formatNumber(data.kpis.blendedROAS.current)}x demonstrates {data.kpis.blendedROAS.current >= 5 ? 'strong' : 'moderate'} return on ad spend
            </p>
          </div>
        </div>
      </section>

      {/* Report Footer */}
      <footer className="report-footer mt-16 pt-6 border-t-2 border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <div>Generated by AI Creative Analysis Dashboard</div>
          <div>Page 1 of 1</div>
        </div>
      </footer>
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <MonthlyReportContent />
    </Suspense>
  );
}
