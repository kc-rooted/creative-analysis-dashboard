'use client';

import { useClient } from '@/components/client-provider';
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Tag, Pencil, Trash2 } from 'lucide-react';

// Types - Simplified to match new schema
interface StrategicContext {
  context_id: string;
  client_id: string;
  context_category: string;
  start_date: string;
  end_date: string | null;
  context_title: string;
  context_description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface BusinessEvent {
  event_id: string;
  client_id: string;
  event_category: string;
  event_date: string;
  impact_end_date: string | null;
  event_title: string;
  event_description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type ContextItem = (StrategicContext | BusinessEvent) & {
  type: 'strategic' | 'event';
};

export default function ContextPage() {
  const { currentClient } = useClient();
  const [items, setItems] = useState<ContextItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'strategic' | 'event'>('strategic');
  const [formData, setFormData] = useState({
    type: 'strategic' as 'strategic' | 'event',
    category: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  // Fetch context and events
  useEffect(() => {
    fetchItems();
  }, [currentClient]);

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && selectedItem && !isCreating) {
      // Populate form with existing item data
      if (selectedItem.type === 'strategic') {
        const item = selectedItem as StrategicContext;
        setFormType('strategic');
        setFormData({
          type: 'strategic',
          category: item.context_category,
          title: item.context_title,
          description: item.context_description,
          start_date: item.start_date,
          end_date: item.end_date || '',
        });
      } else {
        const item = selectedItem as BusinessEvent;
        setFormType('event');
        setFormData({
          type: 'event',
          category: item.event_category,
          title: item.event_title,
          description: item.event_description,
          start_date: item.event_date,
          end_date: item.impact_end_date || '',
        });
      }
    } else if (isCreating) {
      // Reset form for new item
      setFormType('strategic');
      setFormData({
        type: 'strategic',
        category: '',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
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
      const isEditing = selectedItem && !isCreating;
      const method = isEditing ? 'PUT' : 'POST';

      let payload: any;

      if (isEditing) {
        // Update existing item
        const itemId = selectedItem.type === 'strategic'
          ? (selectedItem as StrategicContext).context_id
          : (selectedItem as BusinessEvent).event_id;

        payload = formType === 'strategic'
          ? {
              type: 'strategic',
              id: itemId,
              context_category: formData.category,
              context_title: formData.title,
              context_description: formData.description,
              start_date: formData.start_date,
              end_date: formData.end_date || null,
            }
          : {
              type: 'event',
              id: itemId,
              event_category: formData.category,
              event_title: formData.title,
              event_description: formData.description,
              event_date: formData.start_date,
              impact_end_date: formData.end_date || null,
            };
      } else {
        // Create new item
        payload = formType === 'strategic'
          ? {
              type: 'strategic',
              clientId: currentClient,
              context_category: formData.category,
              context_title: formData.title,
              context_description: formData.description,
              start_date: formData.start_date,
              end_date: formData.end_date || null,
              created_by: 'user',
            }
          : {
              type: 'event',
              clientId: currentClient,
              event_category: formData.category,
              event_title: formData.title,
              event_description: formData.description,
              event_date: formData.start_date,
              impact_end_date: formData.end_date || null,
              created_by: 'user',
            };
      }

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
      const itemType = selectedItem.type;
      const itemId = selectedItem.type === 'strategic'
        ? (selectedItem as StrategicContext).context_id
        : (selectedItem as BusinessEvent).event_id;

      const response = await fetch(`/api/context?type=${itemType}&id=${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      // Clear selection and refresh list
      setSelectedItem(null);
      await fetchItems();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'media_strategy_shift': '#f59e0b',
      'budget_change': '#8b5cf6',
      'market_positioning': '#10b981',
      'operational_constraint': '#ef4444',
      'seasonality_shift': '#3b82f6',
      'organic_pr_win': '#22c55e',
      'product_launch': '#06b6d4',
      'promotion_sale': '#f59e0b',
      'technical_issue': '#ef4444',
      'competitive_event': '#f97316',
    };
    return colors[category] || '#6b7280';
  };


  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6">
      {/* Left Column - Items List (1/4 width) */}
      <div className="w-1/4 flex flex-col">
        <div className="card h-full flex flex-col">
          {/* Header */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Context & Events
              </h2>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(true);
                  setSelectedItem(null);
                }}
                className="btn-primary p-2 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentClient.toUpperCase()}
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
                <p className="text-xs mt-2">Click + to create one</p>
              </div>
            ) : (
              items.map((item) => {
                const title = item.type === 'strategic'
                  ? (item as StrategicContext).context_title
                  : (item as BusinessEvent).event_title;
                const category = item.type === 'strategic'
                  ? (item as StrategicContext).context_category
                  : (item as BusinessEvent).event_category;
                const date = item.type === 'strategic'
                  ? (item as StrategicContext).start_date
                  : (item as BusinessEvent).event_date;

                const isSelected = selectedItem &&
                  ((item.type === 'strategic' && selectedItem.type === 'strategic' &&
                    (item as StrategicContext).context_id === (selectedItem as StrategicContext).context_id) ||
                   (item.type === 'event' && selectedItem.type === 'event' &&
                    (item as BusinessEvent).event_id === (selectedItem as BusinessEvent).event_id));

                return (
                  <button
                    key={item.type === 'strategic' ? (item as StrategicContext).context_id : (item as BusinessEvent).event_id}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditing(false);
                      setIsCreating(false);
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
                          {title}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: getCategoryBadgeColor(category) + '20',
                          color: getCategoryBadgeColor(category),
                        }}
                      >
                        {item.type === 'strategic' ? 'CONTEXT' : 'EVENT'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
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
                {isCreating ? 'Create New' : isEditing ? 'Edit' : 'Preview'}
              </h2>
              {selectedItem && !isCreating && (
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
            {!selectedItem && !isCreating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-lg font-medium">No item selected</p>
                  <p className="text-sm mt-2">Select an item from the list or create a new one</p>
                </div>
              </div>
            ) : isEditing || isCreating ? (
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Type Selector (only for new items) */}
                  {isCreating && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Type
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setFormType('strategic');
                            setFormData({ ...formData, type: 'strategic', category: '' });
                          }}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            formType === 'strategic'
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]'
                              : 'border-[var(--border-muted)]'
                          }`}
                          style={{
                            background: formType === 'strategic' ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                          }}
                        >
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Strategic Context
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormType('event');
                            setFormData({ ...formData, type: 'event', category: '' });
                          }}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            formType === 'event'
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-bg)]'
                              : 'border-[var(--border-muted)]'
                          }`}
                          style={{
                            background: formType === 'event' ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                          }}
                        >
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Business Event
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

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
                      {formType === 'strategic' ? (
                        <>
                          <option value="media_strategy_shift">Media Strategy Shift</option>
                          <option value="budget_change">Budget Change</option>
                          <option value="market_positioning">Market Positioning</option>
                          <option value="operational_constraint">Operational Constraint</option>
                          <option value="seasonality_shift">Seasonality Shift</option>
                        </>
                      ) : (
                        <>
                          <option value="organic_pr_win">Organic PR Win</option>
                          <option value="product_launch">Product Launch</option>
                          <option value="promotion_sale">Promotion/Sale</option>
                          <option value="technical_issue">Technical Issue</option>
                          <option value="competitive_event">Competitive Event</option>
                        </>
                      )}
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
                      Description *
                    </label>
                    <textarea
                      required
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

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        {formType === 'strategic' ? 'Start Date *' : 'Event Date *'}
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
                        {formType === 'strategic' ? 'End Date (optional)' : 'Impact End Date (optional)'}
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
                    {selectedItem.type === 'strategic'
                      ? (selectedItem as StrategicContext).context_title
                      : (selectedItem as BusinessEvent).event_title}
                  </h1>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4">
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                      background: getCategoryBadgeColor(
                        selectedItem.type === 'strategic'
                          ? (selectedItem as StrategicContext).context_category
                          : (selectedItem as BusinessEvent).event_category
                      ) + '20',
                      color: getCategoryBadgeColor(
                        selectedItem.type === 'strategic'
                          ? (selectedItem as StrategicContext).context_category
                          : (selectedItem as BusinessEvent).event_category
                      ),
                    }}
                  >
                    {selectedItem.type === 'strategic' ? 'Strategic Context' : 'Business Event'}
                  </span>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {selectedItem.type === 'strategic'
                        ? `${formatDate((selectedItem as StrategicContext).start_date)} - ${formatDate((selectedItem as StrategicContext).end_date)}`
                        : formatDate((selectedItem as BusinessEvent).event_date)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Description
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {selectedItem.type === 'strategic'
                      ? (selectedItem as StrategicContext).context_description
                      : (selectedItem as BusinessEvent).event_description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
