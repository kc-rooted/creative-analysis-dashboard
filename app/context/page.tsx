'use client';

import { useClient } from '@/components/client-provider';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Pencil, Trash2, FileText, Upload, X, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

// Unified context entry type matching the new schema
interface ContextEntry {
  id: string;
  client_id: string;
  category: string;
  title: string;
  description: string;
  event_date: string | null;  // For point-in-time events
  start_date: string | null;  // For bounded events
  end_date: string | null;
  magnitude: 'major' | 'moderate' | 'minor' | null;
  comparison_significant: boolean | null;
  superseded_by: string | null;
  source: 'manual' | 'document';
  source_document: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

// Extracted entry from document (before saving)
interface ExtractedEntry {
  category: string;
  title: string;
  description: string;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  magnitude: 'major' | 'moderate' | 'minor';
  comparison_significant: boolean;
  confidence: number;
  source: 'document';
  source_document: string;
  selected: boolean; // For UI selection
}

// All categories in a single flat list
const CATEGORIES = [
  { value: 'promotion', label: 'Promotion/Sale' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'organic_pr_win', label: 'Organic PR Win' },
  { value: 'influencer', label: 'Influencer Activity' },
  { value: 'competitor', label: 'Competitor Activity' },
  { value: 'market_trend', label: 'Market Trend' },
  { value: 'budget_change', label: 'Budget Change' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'seasonality', label: 'Seasonality' },
  { value: 'other', label: 'Other' },
];

const getCategoryLabel = (value: string) => {
  return CATEGORIES.find(c => c.value === value)?.label || value.replace(/_/g, ' ');
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'promotion': '#f59e0b',
    'product_launch': '#06b6d4',
    'campaign': '#8b5cf6',
    'organic_pr_win': '#22c55e',
    'influencer': '#ec4899',
    'competitor': '#f97316',
    'market_trend': '#3b82f6',
    'budget_change': '#8b5cf6',
    'technical_issue': '#ef4444',
    'seasonality': '#3b82f6',
    'other': '#6b7280',
  };
  return colors[category] || '#6b7280';
};

// Magnitude options
const MAGNITUDES = [
  { value: 'major', label: 'Major', description: 'Significant impact (>20% change)' },
  { value: 'moderate', label: 'Moderate', description: 'Notable impact (5-20% change)' },
  { value: 'minor', label: 'Minor', description: 'Small impact (<5% change)' },
];

const getMagnitudeColor = (magnitude: string | null) => {
  const colors: Record<string, string> = {
    'major': '#ef4444',
    'moderate': '#f59e0b',
    'minor': '#22c55e',
  };
  return colors[magnitude || ''] || '#6b7280';
};

// Event type options
type EventType = 'point' | 'bounded';
const EVENT_TYPES = [
  { value: 'point', label: 'Point in Time', description: 'Single day event' },
  { value: 'bounded', label: 'Date Range', description: 'Spans multiple days' },
];

export default function ContextPage() {
  const { currentClient } = useClient();
  const [items, setItems] = useState<ContextEntry[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContextEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMode, setShowUploadMode] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [uploadFilename, setUploadFilename] = useState('');
  const [editingExtractedIndex, setEditingExtractedIndex] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    event_type: 'point' as EventType,
    event_date: '',
    start_date: '',
    end_date: '',
    magnitude: 'moderate' as 'major' | 'moderate' | 'minor',
    comparison_significant: false,
  });

  // Fetch context entries
  useEffect(() => {
    if (currentClient) {
      fetchItems();
    }
  }, [currentClient]);

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && selectedItem && !isCreating) {
      // Determine event type based on which date field is set
      const eventType: EventType = selectedItem.event_date ? 'point' : 'bounded';
      setFormData({
        category: selectedItem.category,
        title: selectedItem.title,
        description: selectedItem.description || '',
        event_type: eventType,
        event_date: selectedItem.event_date || '',
        start_date: selectedItem.start_date || '',
        end_date: selectedItem.end_date || '',
        magnitude: selectedItem.magnitude || 'moderate',
        comparison_significant: selectedItem.comparison_significant || false,
      });
    } else if (isCreating) {
      setFormData({
        category: '',
        title: '',
        description: '',
        event_type: 'point',
        event_date: '',
        start_date: '',
        end_date: '',
        magnitude: 'moderate',
        comparison_significant: false,
      });
    }
  }, [isEditing, isCreating, selectedItem]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/context?clientId=${currentClient}`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const isUpdate = selectedItem && !isCreating;
      const method = isUpdate ? 'PUT' : 'POST';

      // Build date fields based on event type
      const dateFields = formData.event_type === 'point'
        ? {
            event_date: formData.event_date || null,
            start_date: null,
            end_date: null,
          }
        : {
            event_date: null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
          };

      const payload = isUpdate
        ? {
            id: selectedItem.id,
            category: formData.category,
            title: formData.title,
            description: formData.description,
            ...dateFields,
            magnitude: formData.magnitude,
            comparison_significant: formData.comparison_significant,
          }
        : {
            clientId: currentClient,
            category: formData.category,
            title: formData.title,
            description: formData.description,
            ...dateFields,
            magnitude: formData.magnitude,
            comparison_significant: formData.comparison_significant,
            source: 'manual',
          };

      const response = await fetch('/api/context', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // Refresh list and exit edit mode
      await fetchItems();
      setIsCreating(false);
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/context?id=${selectedItem.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setSelectedItem(null);
      await fetchItems();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFilename(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', currentClient || '');

      const response = await fetch('/api/context/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to extract context');
      }

      const data = await response.json();

      // Add selected flag to each entry
      const entriesWithSelection = data.entries.map((entry: any) => ({
        ...entry,
        selected: true,
      }));

      setExtractedEntries(entriesWithSelection);
      setShowUploadMode(true);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to extract context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveExtractedEntries = async () => {
    const selectedEntries = extractedEntries.filter(e => e.selected);
    if (selectedEntries.length === 0) {
      alert('Please select at least one entry to save.');
      return;
    }

    setIsSaving(true);

    try {
      // Save each selected entry
      for (const entry of selectedEntries) {
        const payload = {
          clientId: currentClient,
          category: entry.category,
          title: entry.title,
          description: entry.description,
          event_date: entry.event_date,
          start_date: entry.start_date,
          end_date: entry.end_date,
          magnitude: entry.magnitude,
          comparison_significant: entry.comparison_significant,
          source: 'document',
          source_document: entry.source_document,
          confidence: entry.confidence,
        };

        const response = await fetch('/api/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to save entry: ${entry.title}`);
        }
      }

      // Refresh list and exit upload mode
      await fetchItems();
      setShowUploadMode(false);
      setExtractedEntries([]);
      setUploadFilename('');
      setEditingExtractedIndex(null);
    } catch (error) {
      console.error('Error saving extracted entries:', error);
      alert('Failed to save some entries. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExtractedEntry = (index: number, field: string, value: any) => {
    setExtractedEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleEntrySelection = (index: number) => {
    setExtractedEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  const removeExtractedEntry = (index: number) => {
    setExtractedEntries(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper to get the primary date for an item (event_date or start_date)
  const getPrimaryDate = (item: ContextEntry): string => {
    return item.event_date || item.start_date || '';
  };

  // Group items by month
  const groupItemsByMonth = (items: ContextEntry[]) => {
    const groups: Record<string, ContextEntry[]> = {};

    items.forEach(item => {
      const primaryDate = getPrimaryDate(item);
      if (!primaryDate) return; // Skip items without dates

      // Parse date parts directly to avoid timezone issues
      const [year, month] = primaryDate.split('-');
      const monthKey = `${year}-${month}`;

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(item);
    });

    // Sort by month key descending (newest first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(key => {
      const [year, month] = key.split('-');
      // Create date at noon to avoid timezone issues
      const date = new Date(parseInt(year), parseInt(month) - 1, 15);
      return {
        key,
        label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        items: groups[key],
      };
    });
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  // Initialize expanded months when items load
  useEffect(() => {
    if (items.length > 0 && expandedMonths.size === 0) {
      const groups = groupItemsByMonth(items);
      // Expand the first (most recent) month by default
      if (groups.length > 0) {
        setExpandedMonths(new Set([groups[0].key]));
      }
    }
  }, [items]);

  // Render extracted entries preview/edit UI
  const renderExtractedEntriesUI = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Extracted Context
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            From: {uploadFilename} • {extractedEntries.length} entries found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowUploadMode(false);
              setExtractedEntries([]);
              setUploadFilename('');
            }}
            className="btn-secondary px-4 py-2 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveExtractedEntries}
            disabled={isSaving || extractedEntries.filter(e => e.selected).length === 0}
            className="btn-primary px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save {extractedEntries.filter(e => e.selected).length} Selected
              </>
            )}
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {extractedEntries.map((entry, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 transition-all ${
              entry.selected ? 'border-[var(--accent-primary)]' : 'border-[var(--border-muted)] opacity-50'
            }`}
            style={{ background: 'var(--bg-elevated)' }}
          >
            {editingExtractedIndex === index ? (
              // Edit mode
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Category
                    </label>
                    <select
                      value={entry.category}
                      onChange={(e) => updateExtractedEntry(index, 'category', e.target.value)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) => updateExtractedEntry(index, 'title', e.target.value)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Description
                  </label>
                  <textarea
                    value={entry.description}
                    onChange={(e) => updateExtractedEntry(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full p-2 rounded border text-sm"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-muted)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Event Date (point in time)
                    </label>
                    <input
                      type="date"
                      value={entry.event_date || ''}
                      onChange={(e) => updateExtractedEntry(index, 'event_date', e.target.value || null)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Start Date (range)
                    </label>
                    <input
                      type="date"
                      value={entry.start_date || ''}
                      onChange={(e) => updateExtractedEntry(index, 'start_date', e.target.value || null)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={entry.end_date || ''}
                      onChange={(e) => updateExtractedEntry(index, 'end_date', e.target.value || null)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>
                {/* Magnitude and Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Magnitude
                    </label>
                    <select
                      value={entry.magnitude}
                      onChange={(e) => updateExtractedEntry(index, 'magnitude', e.target.value)}
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {MAGNITUDES.map((mag) => (
                        <option key={mag.value} value={mag.value}>
                          {mag.label} - {mag.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entry.comparison_significant}
                        onChange={(e) => updateExtractedEntry(index, 'comparison_significant', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Important for YoY/MoM comparisons
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingExtractedIndex(null)}
                    className="btn-primary px-3 py-1 rounded text-sm"
                  >
                    Done Editing
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleEntrySelection(index)}
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-1 ${
                    entry.selected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-muted)]'
                  }`}
                >
                  {entry.selected && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: getCategoryColor(entry.category) + '20',
                        color: getCategoryColor(entry.category),
                      }}
                    >
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: getMagnitudeColor(entry.magnitude) + '20',
                        color: getMagnitudeColor(entry.magnitude),
                      }}
                    >
                      {entry.magnitude}
                    </span>
                    {entry.comparison_significant && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: '#3b82f620',
                          color: '#3b82f6',
                        }}
                      >
                        YoY/MoM
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(entry.confidence * 100)}% confidence
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    {entry.title}
                  </h3>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {entry.description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {entry.event_date ? (
                      <>{formatDate(entry.event_date)} (point in time)</>
                    ) : (
                      <>
                        {formatDate(entry.start_date)}
                        {entry.end_date && ` - ${formatDate(entry.end_date)}`}
                      </>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingExtractedIndex(index)}
                    className="p-1.5 rounded hover:bg-[var(--bg-primary)]"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button
                    onClick={() => removeExtractedEntry(index)}
                    className="p-1.5 rounded hover:bg-red-500/10"
                    title="Remove"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {extractedEntries.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p>No context entries were extracted from the document.</p>
          <p className="text-sm mt-2">Try uploading a document with more specific business information.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6">
      {/* Left Column - Items List (1/4 width) */}
      <div className="w-1/4 flex flex-col">
        <div className="card h-full flex flex-col">
          {/* Header */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Context
              </h2>
              <div className="flex items-center gap-2">
                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="document-upload"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn-secondary p-2 rounded-lg"
                  title="Upload document"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
                {/* Add Button */}
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setIsEditing(true);
                    setSelectedItem(null);
                    setShowUploadMode(false);
                  }}
                  className="btn-primary p-2 rounded-lg"
                  title="Add manually"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentClient?.toUpperCase() || 'NO CLIENT'}
            </p>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">No context items yet</p>
                <p className="text-xs mt-2">Click + to create or upload a document</p>
              </div>
            ) : (
              groupItemsByMonth(items).map((group) => {
                const isExpanded = expandedMonths.has(group.key);

                return (
                  <div key={group.key} className="mb-2">
                    {/* Month Header - Accordion Toggle */}
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {group.label}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {group.items.length}
                      </span>
                    </button>

                    {/* Month Items */}
                    {isExpanded && (
                      <div className="mt-1 space-y-2 pl-6">
                        {group.items.map((item) => {
                          const isSelected = selectedItem?.id === item.id && !showUploadMode;

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setSelectedItem(item);
                                setIsEditing(false);
                                setIsCreating(false);
                                setShowUploadMode(false);
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                isSelected ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]' : 'border-[var(--border-muted)]'
                              }`}
                              style={{
                                background: isSelected ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                              }}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                    {item.title}
                                  </h3>
                                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    {formatDate(getPrimaryDate(item))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-xs px-2 py-1 rounded"
                                  style={{
                                    background: getCategoryColor(item.category) + '20',
                                    color: getCategoryColor(item.category),
                                  }}
                                >
                                  {getCategoryLabel(item.category)}
                                </span>
                                {item.magnitude && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                      background: getMagnitudeColor(item.magnitude) + '20',
                                      color: getMagnitudeColor(item.magnitude),
                                    }}
                                  >
                                    {item.magnitude}
                                  </span>
                                )}
                                {item.comparison_significant && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                      background: '#3b82f620',
                                      color: '#3b82f6',
                                    }}
                                  >
                                    YoY
                                  </span>
                                )}
                                {item.source === 'document' && (
                                  <FileText className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Preview/Edit (3/4 width) */}
      <div className="flex-1 flex flex-col">
        <div className="card h-full flex flex-col">
          {/* Header */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {showUploadMode ? 'Review Extracted Context' : isCreating ? 'Create New' : isEditing ? 'Edit' : 'Preview'}
              </h2>
              {selectedItem && !isCreating && !showUploadMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-secondary p-2 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg"
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {showUploadMode ? (
              renderExtractedEntriesUI()
            ) : !selectedItem && !isCreating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-lg font-medium">No item selected</p>
                  <p className="text-sm mt-2">Select an item from the list or create a new one</p>
                </div>
              </div>
            ) : isEditing || isCreating ? (
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--bg-elevated)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Select a category...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Short descriptive title"
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--bg-elevated)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed explanation of what happened and why..."
                      rows={5}
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--bg-elevated)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  {/* Event Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Event Type *
                    </label>
                    <div className="flex gap-2">
                      {EVENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, event_type: type.value as EventType })}
                          className={`flex-1 p-3 rounded-lg border text-sm transition-all ${
                            formData.event_type === type.value
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]'
                              : 'border-[var(--border-muted)]'
                          }`}
                          style={{
                            background: formData.event_type === type.value ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {type.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates - conditionally show based on event type */}
                  {formData.event_type === 'point' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Event Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.event_date}
                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                        className="w-full p-3 rounded-lg border"
                        style={{
                          background: 'var(--bg-elevated)',
                          borderColor: 'var(--border-muted)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          Start Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="w-full p-3 rounded-lg border"
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--border-muted)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          End Date (optional)
                        </label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="w-full p-3 rounded-lg border"
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--border-muted)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Magnitude Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Impact Magnitude
                    </label>
                    <div className="flex gap-2">
                      {MAGNITUDES.map((mag) => (
                        <button
                          key={mag.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, magnitude: mag.value as 'major' | 'moderate' | 'minor' })}
                          className={`flex-1 p-3 rounded-lg border text-sm transition-all ${
                            formData.magnitude === mag.value
                              ? 'border-2'
                              : 'border-[var(--border-muted)]'
                          }`}
                          style={{
                            background: formData.magnitude === mag.value
                              ? getMagnitudeColor(mag.value) + '15'
                              : 'var(--bg-elevated)',
                            borderColor: formData.magnitude === mag.value
                              ? getMagnitudeColor(mag.value)
                              : 'var(--border-muted)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <div className="font-medium">{mag.label}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {mag.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comparison Significant Toggle */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-elevated)' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, comparison_significant: !formData.comparison_significant })}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        formData.comparison_significant ? 'bg-[var(--accent-primary)]' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        formData.comparison_significant ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        Important for YoY/MoM Comparisons
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Enable if this context explains significant differences in period-over-period analysis
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary px-6 py-3 rounded-lg font-medium"
                    >
                      {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                      }}
                      className="btn-secondary px-6 py-3 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedItem && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedItem.title}
                  </h1>
                </div>

                {/* Primary Metadata Row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                      background: getCategoryColor(selectedItem.category) + '20',
                      color: getCategoryColor(selectedItem.category),
                    }}
                  >
                    {getCategoryLabel(selectedItem.category)}
                  </span>
                  {selectedItem.magnitude && (
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium"
                      style={{
                        background: getMagnitudeColor(selectedItem.magnitude) + '20',
                        color: getMagnitudeColor(selectedItem.magnitude),
                      }}
                    >
                      {selectedItem.magnitude.charAt(0).toUpperCase() + selectedItem.magnitude.slice(1)} Impact
                    </span>
                  )}
                  {selectedItem.comparison_significant && (
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium"
                      style={{
                        background: '#3b82f620',
                        color: '#3b82f6',
                      }}
                    >
                      YoY/MoM Significant
                    </span>
                  )}
                </div>

                {/* Date Info */}
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedItem.event_date ? (
                      formatDate(selectedItem.event_date)
                    ) : (
                      <>
                        {formatDate(selectedItem.start_date)}
                        {selectedItem.end_date && ` - ${formatDate(selectedItem.end_date)}`}
                      </>
                    )}
                    {selectedItem.event_date && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(point in time)</span>
                    )}
                    {selectedItem.start_date && !selectedItem.end_date && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(ongoing)</span>
                    )}
                  </span>
                </div>

                {/* Source Info */}
                {selectedItem.source === 'document' && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">
                      Extracted from: {selectedItem.source_document}
                      {selectedItem.confidence && ` (${Math.round(selectedItem.confidence * 100)}% confidence)`}
                    </span>
                  </div>
                )}

                {/* Description */}
                {selectedItem.description && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Description
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {selectedItem.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
