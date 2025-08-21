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
        // Refresh the main dashboard
        router.push('/');
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
    };
    setEditingClient(newClient);
    setIsCreating(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Admin Panel - Client Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure client datasets, brand guidelines, and analysis settings
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current Active Client</h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {clients.find(c => c.id === currentClientId)?.name || 'None Selected'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Client Configurations</h2>
              <button
                onClick={createNewClient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {clients.map((client) => (
              <div key={client.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium">{client.name}</h3>
                      {currentClientId === client.id && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Dataset: {client.bigquery.dataset} • Industry: {client.brand.industry}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Palette className="w-4 h-4 text-gray-400" />
                      <div className="flex gap-1">
                        {client.brand.colors.slice(0, 5).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded border border-gray-200"
                            style={{ backgroundColor: color.hex }}
                            title={`${color.name} - ${color.hex}`}
                          />
                        ))}
                        {client.brand.colors.length > 5 && (
                          <span className="text-xs text-gray-500 ml-1">
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
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-medium"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => setEditingClient(client)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {clients.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No clients configured yet</p>
                <button
                  onClick={createNewClient}
                  className="mt-2 text-blue-600 hover:text-blue-700"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isCreating ? 'Create New Client' : 'Edit Client'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={editedClient.id}
                onChange={(e) => setEditedClient(prev => ({ ...prev, id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="client_id_lowercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={editedClient.name}
                onChange={(e) => setEditedClient(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Client Display Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BigQuery Dataset
            </label>
            <input
              type="text"
              value={editedClient.bigquery.dataset}
              onChange={(e) => setEditedClient(prev => ({ 
                ...prev, 
                bigquery: { ...prev.bigquery, dataset: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="client_analytics"
            />
          </div>

          {/* Brand Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Brand Colors
              </label>
              <button
                onClick={addBrandColor}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Color
              </button>
            </div>
            <div className="space-y-3">
              {editedClient.brand.colors.map((color, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateBrandColor(index, { hex: e.target.value })}
                    className="w-12 h-8 rounded border border-gray-300"
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => updateBrandColor(index, { name: e.target.value })}
                      placeholder="Color name"
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={color.description}
                      onChange={(e) => updateBrandColor(index, { description: e.target.value })}
                      placeholder="Description"
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={color.usage}
                      onChange={(e) => updateBrandColor(index, { usage: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
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
                    className="text-red-400 hover:text-red-600"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={editedClient.brand.industry}
                onChange={(e) => setEditedClient(prev => ({ 
                  ...prev, 
                  brand: { ...prev.brand, industry: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. golf_equipment, retail, technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Personality
              </label>
              <input
                type="text"
                value={editedClient.brand.brandPersonality}
                onChange={(e) => setEditedClient(prev => ({ 
                  ...prev, 
                  brand: { ...prev.brand, brandPersonality: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. premium_performance_focused_innovative"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Prompt Additions
            </label>
            <textarea
              value={editedClient.analysis.customPromptAdditions || ''}
              onChange={(e) => setEditedClient(prev => ({ 
                ...prev, 
                analysis: { ...prev.analysis, customPromptAdditions: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional context for Claude analysis..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedClient)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isCreating ? 'Create Client' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}