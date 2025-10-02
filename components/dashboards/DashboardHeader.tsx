'use client';

import { DateRange, DashboardSection } from '@/types/dashboard';

interface DashboardHeaderProps {
  sections: readonly DashboardSection[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export default function DashboardHeader({
  sections,
  activeSection,
  onSectionChange,
  dateRange,
  onDateRangeChange,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex justify-center">
      {/* Section tabs */}
      <div className="card p-0 overflow-hidden" style={{ width: 'fit-content' }}>
        <div className="flex">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`
                px-6 py-4 text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0
                ${activeSection === section.id
                  ? 'btn-primary'
                  : 'hover:bg-[var(--bg-elevated)]'
                }
              `}
              style={activeSection !== section.id ? {
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none'
              } : {}}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}