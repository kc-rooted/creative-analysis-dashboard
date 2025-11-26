'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboards/DashboardHeader';
import DashboardGrid from '@/components/dashboards/DashboardGrid';
import { DateRange } from '@/types/dashboard';
import { useClient } from '@/components/client-provider';
import { NoClientSelected } from '@/components/NoClientSelected';

// All available dashboard sections
const ALL_DASHBOARD_SECTIONS = [
  { id: 'overview', label: 'Business Overview', clients: ['jumbomax', 'puttout', 'hb', 'benhogan'] },
  { id: 'facebook', label: 'Meta Ads', clients: ['jumbomax', 'puttout', 'hb', 'benhogan'] },
  { id: 'meta-ads-optimization', label: 'Meta Ads Optimization', clients: [] },
  { id: 'google', label: 'Google Ads', clients: ['jumbomax', 'hb', 'puttout'] },
  { id: 'funnel', label: 'Funnel Optimization', clients: ['puttout'] },
  { id: 'email', label: 'Email & Retention', clients: ['jumbomax', 'puttout'] },
  { id: 'organic-social', label: 'Organic Social', clients: ['jumbomax', 'benhogan'] },
  { id: 'product', label: 'Product', clients: ['jumbomax', 'puttout', 'hb', 'benhogan'] },
  { id: 'customers', label: 'Customers', clients: ['jumbomax', 'puttout', 'hb', 'benhogan'] },
  { id: 'forecasting', label: 'Forecasting', clients: ['jumbomax', 'puttout', 'hb', 'benhogan'] },
  { id: 'operational', label: 'Operational', clients: ['jumbomax'] },
] as const;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentClient, isLoading } = useClient();

  // If no client is selected, show message
  if (!isLoading && !currentClient) {
    return <NoClientSelected />;
  }

  // Filter sections based on current client
  const availableSections = ALL_DASHBOARD_SECTIONS.filter(section =>
    currentClient && section.clients.includes(currentClient as any)
  );

  // Initialize from URL query params, fallback to 'overview'
  const [activeSection, setActiveSection] = useState<string>(() => {
    const section = searchParams.get('section');
    return section || 'overview';
  });

  // Initialize with last 7 days preset and actual dates
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'last7days',
    startDate: startOfDay(subDays(now, 6)),
    endDate: endOfDay(now),
  });

  // Update URL when section changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    router.push(`/dashboards?section=${section}`, { scroll: false });
  };

  // Sync state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && section !== activeSection) {
      setActiveSection(section);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          sections={availableSections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          dateRange={undefined}
          onDateRangeChange={undefined}
        />

        <div className="mt-6">
          <DashboardGrid
            section={activeSection}
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
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
    }>
      <DashboardContent />
    </Suspense>
  );
}