'use client';

import { useState } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboards/DashboardHeader';
import DashboardGrid from '@/components/dashboards/DashboardGrid';
import { DateRange } from '@/types/dashboard';

// Dashboard sections
const DASHBOARD_SECTIONS = [
  { id: 'overview', label: 'Business Overview' },
  { id: 'platform', label: 'Platform Performance' },
  { id: 'email', label: 'Email & Retention' },
  { id: 'product', label: 'Product' },
  { id: 'customers', label: 'Customers' },
  { id: 'forecasting', label: 'Forecasting' },
  { id: 'operational', label: 'Operational' },
] as const;

export default function DashboardsPage() {
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Initialize with last 7 days preset and actual dates
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'last7days',
    startDate: startOfDay(subDays(now, 6)),
    endDate: endOfDay(now),
  });

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          sections={DASHBOARD_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
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