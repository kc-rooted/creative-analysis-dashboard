'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BrandColor {
  name: string;
  hex: string;
  description: string;
  usage: string;
}

interface ClientConfig {
  id: string;
  name: string;
  bigquery: {
    dataset: string;
  };
  brand: {
    colors: BrandColor[];
    industry: string;
    targetAudience: string[];
    productCategories: string[];
    brandPersonality: string;
    competitiveContext: string;
  };
  analysis: {
    focusAreas: string[];
    customPromptAdditions?: string;
  };
  dashboard?: {
    monthlyRevenueTargets?: number[];
    monthlyRoasTarget?: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientConfig[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string>('');
  const [editingClient, setEditingClient] = useState<ClientConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchCurrentClient();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentClient = async () => {
    try {
      const response = await fetch('/api/admin/current-client');
      if (response.ok) {
        const data = await response.json();
        setCurrentClientId(data.clientId);
      }
    } catch (error) {
      console.error('Error fetching current client:', error);
    }
  };

  const handleSaveClient = async (client: ClientConfig) => {
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });

      if (response.ok) {
        await fetchClients();
        setEditingClient(null);
        setIsCreating(false);
      } else {
        console.error('Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch(`/api/admin/clients?id=${clientId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchClients();
      } else {
        console.error('Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleSetCurrentClient = async (clientId: string) => {
    try {
      const response = await fetch('/api/admin/current-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (response.ok) {
        setCurrentClientId(clientId);
        // Client successfully changed
        window.location.href = '/';
      } else {
        console.error('Failed to set current client');
      }
    } catch (error) {
      console.error('Error setting current client:', error);
    }
  };

  const createNewClient = () => {
    const newClient: ClientConfig = {
      id: '',
      name: '',
      bigquery: { dataset: '' },
      brand: {
        colors: [],
        industry: '',
        targetAudience: [],
        productCategories: [],
        brandPersonality: '',
        competitiveContext: '',
      },
      analysis: {
        focusAreas: [],
        customPromptAdditions: '',
      },
      dashboard: {
        monthlyRevenueTargets: [],
        monthlyRoasTarget: 6.5
      }
    };
    setEditingClient(newClient);
    setIsCreating(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen">

        <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center" style={{minHeight: 'calc(100vh - 200px)'}}>
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Page Title */}
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-6 h-6" style={{color: 'var(--accent-primary)'}} />
          <h2 style={{color: 'var(--text-primary)'}}>Admin Panel - Client Management</h2>
        </div>
        <p className="text-sm" style={{color: 'var(--text-muted)'}}>
          Configure client datasets, brand guidelines, and analysis settings
        </p>
      </div>

      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Current Active Client</h2>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{background: 'var(--accent-bg)', color: 'var(--accent-primary)'}}>
              {clients.find(c => c.id === currentClientId)?.name || 'None Selected'}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b" style={{borderColor: 'var(--border-muted)'}}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Client Configurations</h2>
              <button
                onClick={createNewClient}
                className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            </div>
          </div>

          <div className="divide-y" style={{borderColor: 'var(--border-muted)'}}>
            {clients.map((client) => (
              <div key={client.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>{client.name}</h3>
                      {currentClientId === client.id && (
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{background: 'var(--accent-bg)', color: 'var(--accent-primary)'}}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                      Dataset: {client.bigquery.dataset} • Industry: {client.brand.industry}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Palette className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                      <div className="flex gap-1">
                        {client.brand.colors.slice(0, 5).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.hex, borderColor: 'var(--border-muted)' }}
                            title={`${color.name} - ${color.hex}`}
                          />
                        ))}
                        {client.brand.colors.length > 5 && (
                          <span className="text-xs ml-1" style={{color: 'var(--text-muted)'}}>
                            +{client.brand.colors.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentClientId !== client.id && (
                      <button
                        onClick={() => handleSetCurrentClient(client.id)}
                        className="btn-secondary px-3 py-1 text-sm font-medium"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => setEditingClient(client)}
                      className="p-2 transition-colors duration-200"
                      style={{color: 'var(--text-muted)'}}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {clients.length === 0 && (
              <div className="p-12 text-center" style={{color: 'var(--text-muted)'}}>
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No clients configured yet</p>
                <button
                  onClick={createNewClient}
                  className="mt-2 transition-colors duration-200"
                  style={{color: 'var(--accent-primary)'}}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                >
                  Add your first client
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit/Create Client Modal */}
      {editingClient && (
        <ClientEditModal
          client={editingClient}
          isCreating={isCreating}
          onSave={handleSaveClient}
          onCancel={() => {
            setEditingClient(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}

// Separate component for the edit modal
function ClientEditModal({
  client,
  isCreating,
  onSave,
  onCancel,
}: {
  client: ClientConfig;
  isCreating: boolean;
  onSave: (client: ClientConfig) => void;
  onCancel: () => void;
}) {
  const [editedClient, setEditedClient] = useState<ClientConfig>({ ...client });

  const addBrandColor = () => {
    setEditedClient(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        colors: [
          ...prev.brand.colors,
          { name: '', hex: '#000000', description: '', usage: 'primary_brand' }
        ]
      }
    }));
  };

  const updateBrandColor = (index: number, updates: Partial<BrandColor>) => {
    setEditedClient(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        colors: prev.brand.colors.map((color, i) =>
          i === index ? { ...color, ...updates } : color
        )
      }
    }));
  };

  const removeBrandColor = (index: number) => {
    setEditedClient(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        colors: prev.brand.colors.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{background: 'var(--bg-overlay)'}}>
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b" style={{borderColor: 'var(--border-muted)'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              {isCreating ? 'Create New Client' : 'Edit Client'}
            </h2>
            <button onClick={onCancel} className="transition-colors duration-200" style={{color: 'var(--text-muted)'}} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Client ID
              </label>
              <input
                type="text"
                value={editedClient.id}
                onChange={(e) => setEditedClient(prev => ({ ...prev, id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                placeholder="client_id_lowercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Client Name
              </label>
              <input
                type="text"
                value={editedClient.name}
                onChange={(e) => setEditedClient(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                placeholder="Client Display Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              BigQuery Dataset
            </label>
            <input
              type="text"
              value={editedClient.bigquery.dataset}
              onChange={(e) => setEditedClient(prev => ({ 
                ...prev, 
                bigquery: { ...prev.bigquery, dataset: e.target.value }
              }))}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
              placeholder="client_analytics"
            />
          </div>

          {/* Brand Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Brand Colors
              </label>
              <button
                onClick={addBrandColor}
                className="btn-primary px-3 py-1 text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Color
              </button>
            </div>
            <div className="space-y-3">
              {editedClient.brand.colors.map((color, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg" style={{background: 'var(--bg-elevated)'}}>
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateBrandColor(index, { hex: e.target.value })}
                    className="w-12 h-8 rounded"
                    style={{border: '1px solid var(--border-muted)'}}
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => updateBrandColor(index, { name: e.target.value })}
                      placeholder="Color name"
                      className="px-2 py-1 rounded text-sm"
                      style={{background: 'var(--bg-card)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                    />
                    <input
                      type="text"
                      value={color.description}
                      onChange={(e) => updateBrandColor(index, { description: e.target.value })}
                      placeholder="Description"
                      className="px-2 py-1 rounded text-sm"
                      style={{background: 'var(--bg-card)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                    />
                    <select
                      value={color.usage}
                      onChange={(e) => updateBrandColor(index, { usage: e.target.value })}
                      className="px-2 py-1 rounded text-sm"
                      style={{background: 'var(--bg-card)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                    >
                      <option value="primary_brand">Primary Brand</option>
                      <option value="accent">Accent</option>
                      <option value="text">Text</option>
                      <option value="background">Background</option>
                      <option value="secondary_text">Secondary Text</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeBrandColor(index)}
                    className="text-red-400 hover:text-red-300 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Industry
              </label>
              <input
                type="text"
                value={editedClient.brand.industry}
                onChange={(e) => setEditedClient(prev => ({ 
                  ...prev, 
                  brand: { ...prev.brand, industry: e.target.value }
                }))}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                placeholder="e.g. golf_equipment, retail, technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Brand Personality
              </label>
              <input
                type="text"
                value={editedClient.brand.brandPersonality}
                onChange={(e) => setEditedClient(prev => ({ 
                  ...prev, 
                  brand: { ...prev.brand, brandPersonality: e.target.value }
                }))}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                placeholder="e.g. premium_performance_focused_innovative"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              Custom Prompt Additions
            </label>
            <textarea
              value={editedClient.analysis.customPromptAdditions || ''}
              onChange={(e) => setEditedClient(prev => ({
                ...prev,
                analysis: { ...prev.analysis, customPromptAdditions: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
              placeholder="Additional context for Claude analysis..."
            />
          </div>

          {/* Dashboard Configuration */}
          <div className="border-t pt-6" style={{borderColor: 'var(--border-muted)'}}>
            <h3 className="text-md font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Dashboard Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                  Monthly Revenue Targets (comma-separated, 12 values for Jan-Dec)
                </label>
                <input
                  type="text"
                  value={editedClient.dashboard?.monthlyRevenueTargets?.join(',') || ''}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                    setEditedClient(prev => ({
                      ...prev,
                      dashboard: {
                        ...prev.dashboard,
                        monthlyRevenueTargets: values.length === 12 ? values : prev.dashboard?.monthlyRevenueTargets
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-md focus:outline-none font-mono text-sm"
                  style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                  placeholder="300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000"
                />
                <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                  Enter exactly 12 comma-separated values (one for each month)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                  Monthly ROAS Target
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editedClient.dashboard?.monthlyRoasTarget || ''}
                  onChange={(e) => setEditedClient(prev => ({
                    ...prev,
                    dashboard: {
                      ...prev.dashboard,
                      monthlyRoasTarget: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)'}}
                  placeholder="6.5"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{borderColor: 'var(--border-muted)'}}>
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedClient)}
            className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isCreating ? 'Create Client' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}