'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboards/DashboardHeader';
import DashboardGrid from '@/components/dashboards/DashboardGrid';
import { DateRange } from '@/types/dashboard';

// Dashboard sections
const DASHBOARD_SECTIONS = [
  { id: 'overview', label: 'Business Overview' },
  { id: 'platform', label: 'Platform Performance' },
  { id: 'facebook', label: 'Facebook Ads' },
  { id: 'email', label: 'Email & Retention' },
  { id: 'product', label: 'Product' },
  { id: 'customers', label: 'Customers' },
  { id: 'forecasting', label: 'Forecasting' },
  { id: 'operational', label: 'Operational' },
] as const;

export default function DashboardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
          sections={DASHBOARD_SECTIONS}
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