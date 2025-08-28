'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Users, Instagram, TrendingUp, Mail, Edit, Trash2, ExternalLink } from 'lucide-react';
import { InfluencerCard } from '@/components/InfluencerCard';
import { InfluencerForm } from '@/components/InfluencerForm';

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  followers: number;
  engagement_rate: number;
  niche: string[];
  location: string;
  email?: string;
  phone?: string;
  notes?: string;
  status: 'active' | 'pending' | 'inactive';
  last_campaign?: string;
  total_campaigns: number;
  average_performance: number;
  content_types: string[];
  rate_per_post?: number;
  created_at: string;
  updated_at: string;
}

export default function InfluencerPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);

  const fetchInfluencers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/influencers');
      if (response.ok) {
        const data = await response.json();
        setInfluencers(data);
      }
    } catch (error) {
      console.error('Error fetching influencers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this influencer?')) return;

    try {
      const response = await fetch(`/api/influencers?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchInfluencers();
      }
    } catch (error) {
      console.error('Error deleting influencer:', error);
    }
  };

  const handleSave = async (influencer: Partial<Influencer>) => {
    try {
      const method = influencer.id ? 'PUT' : 'POST';
      const response = await fetch('/api/influencers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(influencer),
      });
      
      if (response.ok) {
        await fetchInfluencers();
        setShowForm(false);
        setEditingInfluencer(null);
      }
    } catch (error) {
      console.error('Error saving influencer:', error);
    }
  };

  const filteredInfluencers = influencers.filter(influencer => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        influencer.name.toLowerCase().includes(query) ||
        influencer.handle.toLowerCase().includes(query) ||
        influencer.niche.some(n => n.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    if (statusFilter && influencer.status !== statusFilter) return false;
    if (platformFilter && influencer.platform !== platformFilter) return false;

    return true;
  });

  // Calculate stats
  const totalInfluencers = influencers.length;
  const activeInfluencers = influencers.filter(i => i.status === 'active').length;
  const totalReach = influencers.reduce((sum, i) => sum + i.followers, 0);
  const avgEngagement = influencers.reduce((sum, i) => sum + i.engagement_rate, 0) / (influencers.length || 1);

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            Influencer Management
          </h1>
          <p className="text-base" style={{color: 'var(--text-muted)'}}>
            Manage your influencer relationships and campaign collaborations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" style={{color: 'var(--accent-primary)'}} />
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{totalInfluencers}</p>
                <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Influencers</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8" style={{color: '#22c55e'}} />
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{activeInfluencers}</p>
                <p className="text-sm" style={{color: 'var(--text-muted)'}}>Active</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Instagram className="w-8 h-8" style={{color: '#e11d48'}} />
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {totalReach >= 1000000 ? `${(totalReach / 1000000).toFixed(1)}M` : 
                   totalReach >= 1000 ? `${(totalReach / 1000).toFixed(0)}K` : totalReach}
                </p>
                <p className="text-sm" style={{color: 'var(--text-muted)'}}>Total Reach</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8" style={{color: '#a855f7'}} />
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{avgEngagement.toFixed(1)}%</p>
                <p className="text-sm" style={{color: 'var(--text-muted)'}}>Avg Engagement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-muted)'}} />
            <input
              type="text"
              placeholder="Search influencers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-4 py-2 rounded-lg"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="twitter">Twitter</option>
          </select>

          <button
            onClick={() => {
              setEditingInfluencer(null);
              setShowForm(true);
            }}
            className="btn-primary px-4 py-2 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Influencer
          </button>
        </div>

        {/* Influencer Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 animate-logo-breathing">
              <svg viewBox="0 0 1000 1000" className="w-full h-full">
                <defs>
                  <style>
                    {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                  </style>
                </defs>
                <rect className="logo-bg" width="1000" height="1000"/>
                <g>
                  <g>
                    <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"/>
                    <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"/>
                  </g>
                  <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"/>
                </g>
              </svg>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInfluencers.map(influencer => (
              <InfluencerCard
                key={influencer.id}
                influencer={influencer}
                onEdit={() => {
                  setEditingInfluencer(influencer);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(influencer.id)}
              />
            ))}

            {filteredInfluencers.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" style={{color: 'var(--text-muted)'}} />
                <p className="text-lg" style={{color: 'var(--text-muted)'}}>
                  {searchQuery || statusFilter || platformFilter ? 
                    'No influencers found matching your filters' : 
                    'No influencers added yet'}
                </p>
                {!searchQuery && !statusFilter && !platformFilter && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-sm"
                    style={{color: 'var(--accent-primary)'}}
                  >
                    Add your first influencer
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <InfluencerForm
            influencer={editingInfluencer}
            onSave={handleSave}
            onClose={() => {
              setShowForm(false);
              setEditingInfluencer(null);
            }}
          />
        )}
      </div>
    </div>
  );
}