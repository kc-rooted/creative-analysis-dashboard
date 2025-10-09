'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboards/DashboardHeader';
import DashboardGrid from '@/components/dashboards/DashboardGrid';
import { DateRange } from '@/types/dashboard';

// All available dashboard sections
const ALL_DASHBOARD_SECTIONS = [
  { id: 'overview', label: 'Business Overview', clients: ['jumbomax', 'puttout'] },
  { id: 'facebook', label: 'Facebook Ads', clients: ['jumbomax', 'puttout'] },
  { id: 'google', label: 'Google Ads', clients: ['jumbomax'] },
  { id: 'funnel', label: 'Funnel Optimization', clients: ['puttout'] },
  { id: 'email', label: 'Email & Retention', clients: ['jumbomax', 'puttout'] },
  { id: 'product', label: 'Product', clients: ['jumbomax', 'puttout'] },
  { id: 'customers', label: 'Customers', clients: ['jumbomax', 'puttout'] },
  { id: 'forecasting', label: 'Forecasting', clients: ['jumbomax', 'puttout'] },
  { id: 'operational', label: 'Operational', clients: ['jumbomax'] },
] as const;

export default function DashboardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentClient, setCurrentClient] = useState<string>('jumbomax');

  // Fetch current client on mount
  useEffect(() => {
    const fetchCurrentClient = async () => {
      try {
        const response = await fetch('/api/admin/current-client');
        if (response.ok) {
          const data = await response.json();
          setCurrentClient(data.clientId);
        }
      } catch (error) {
        console.error('Error fetching current client:', error);
      }
    };
    fetchCurrentClient();
  }, []);

  // Filter sections based on current client
  const availableSections = ALL_DASHBOARD_SECTIONS.filter(section =>
    section.clients.includes(currentClient as any)
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