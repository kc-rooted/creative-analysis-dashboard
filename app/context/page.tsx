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

  // Fetch context and events
  useEffect(() => {
    fetchItems();
  }, [currentClient]);

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

  const getItemIcon = (item: ContextItem) => {
    return <Calendar className="w-4 h-4 text-blue-500" />;
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
                      {getItemIcon(item)}
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
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this item?')) {
                        // TODO: Implement delete
                        setSelectedItem(null);
                        fetchItems();
                      }
                    }}
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
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Edit form coming soon...
                </p>
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
