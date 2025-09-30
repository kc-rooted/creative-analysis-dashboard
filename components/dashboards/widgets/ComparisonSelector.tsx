'use client';

import { useState, useEffect } from 'react';

export type ComparisonType = 'previous-period' | 'previous-year';

interface ComparisonSelectorProps {
  onComparisonChange: (type: ComparisonType) => void;
  value?: ComparisonType;
}

export default function ComparisonSelector({ onComparisonChange, value = 'previous-period' }: ComparisonSelectorProps) {
  const [selectedType, setSelectedType] = useState<ComparisonType>(value);

  // Update internal state when external value changes
  useEffect(() => {
    setSelectedType(value);
  }, [value]);

  const options = [
    { value: 'previous-period' as ComparisonType, label: 'Previous Period' },
    { value: 'previous-year' as ComparisonType, label: 'Previous Year' },
  ];

  const handleClick = (type: ComparisonType) => {
    setSelectedType(type);
    onComparisonChange(type);
  };

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Compare:</span>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedType === option.value
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-muted)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
