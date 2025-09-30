'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export type DatePreset = 'mtd' | 'ytd' | 'last7' | 'yesterday' | 'custom';

interface DateFilterProps {
  onDateChange: (preset: DatePreset, startDate?: string, endDate?: string) => void;
  value?: DatePreset;
}

export default function DateFilter({ onDateChange, value = 'mtd' }: DateFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(value);

  // Update internal state when external value changes
  useEffect(() => {
    setSelectedPreset(value);
  }, [value]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = [
    { value: 'mtd' as DatePreset, label: 'Month to Date' },
    { value: 'ytd' as DatePreset, label: 'Year to Date' },
    { value: 'last7' as DatePreset, label: 'Last 7 Days' },
    { value: 'yesterday' as DatePreset, label: 'Yesterday' },
    { value: 'custom' as DatePreset, label: 'Custom Range' },
  ];

  const handlePresetClick = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
      onDateChange(preset);
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      setShowCalendar(false);
      onDateChange('custom', startDate, endDate);
    }
  };

  const getMaxDate = () => {
    // Yesterday's date (since we don't include today)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  return (
    <div className="relative">
      <div className="flex gap-2 items-center">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPreset === preset.value
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-muted)]'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg z-50"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-muted)' }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              <Calendar className="h-4 w-4" />
              <span>Select Date Range</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={getMaxDate()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  max={getMaxDate()}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApplyCustomRange}
                disabled={!startDate || !endDate}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--border-muted)',
                  color: 'var(--text-secondary)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
