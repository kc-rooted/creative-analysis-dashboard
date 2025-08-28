'use client';

import { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import type { Influencer } from '@/app/influencer/page';

interface InfluencerFormProps {
  influencer: Influencer | null;
  onSave: (influencer: Partial<Influencer>) => void;
  onClose: () => void;
}

export function InfluencerForm({ influencer, onSave, onClose }: InfluencerFormProps) {
  const [formData, setFormData] = useState<Partial<Influencer>>({
    name: influencer?.name || '',
    handle: influencer?.handle || '',
    platform: influencer?.platform || 'instagram',
    followers: influencer?.followers || 0,
    engagement_rate: influencer?.engagement_rate || 0,
    niche: influencer?.niche || [],
    location: influencer?.location || '',
    email: influencer?.email || '',
    phone: influencer?.phone || '',
    notes: influencer?.notes || '',
    status: influencer?.status || 'pending',
    content_types: influencer?.content_types || [],
    rate_per_post: influencer?.rate_per_post || undefined,
    ...(influencer && { id: influencer.id })
  });

  const [nicheInput, setNicheInput] = useState('');
  const [contentTypeInput, setContentTypeInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addNiche = () => {
    if (nicheInput.trim() && !formData.niche?.includes(nicheInput.trim())) {
      setFormData(prev => ({
        ...prev,
        niche: [...(prev.niche || []), nicheInput.trim()]
      }));
      setNicheInput('');
    }
  };

  const removeNiche = (index: number) => {
    setFormData(prev => ({
      ...prev,
      niche: prev.niche?.filter((_, i) => i !== index) || []
    }));
  };

  const addContentType = () => {
    if (contentTypeInput.trim() && !formData.content_types?.includes(contentTypeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        content_types: [...(prev.content_types || []), contentTypeInput.trim()]
      }));
      setContentTypeInput('');
    }
  };

  const removeContentType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content_types: prev.content_types?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{background: 'var(--bg-overlay)'}}>
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b" style={{borderColor: 'var(--border-muted)'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              {influencer ? 'Edit Influencer' : 'Add New Influencer'}
            </h2>
            <button 
              onClick={onClose}
              className="transition-colors duration-200"
              style={{color: 'var(--text-muted)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Handle *
              </label>
              <input
                type="text"
                value={formData.handle}
                onChange={(e) => setFormData(prev => ({ ...prev, handle: e.target.value }))}
                placeholder="@username"
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Platform *
              </label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
                required
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Followers *
              </label>
              <input
                type="number"
                value={formData.followers}
                onChange={(e) => setFormData(prev => ({ ...prev, followers: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Engagement Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.engagement_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, engagement_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Rate per Post ($)
              </label>
              <input
                type="number"
                value={formData.rate_per_post || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rate_per_post: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Niches */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              Niches
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={nicheInput}
                onChange={(e) => setNicheInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNiche())}
                placeholder="Add a niche..."
                className="flex-1 px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={addNiche}
                className="px-3 py-2 rounded-md"
                style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent-primary)'
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.niche?.map((n, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  style={{
                    background: 'var(--accent-bg)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  {n}
                  <button
                    type="button"
                    onClick={() => removeNiche(idx)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="City, Country"
              className="w-full px-3 py-2 rounded-md"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)'
              }}
              placeholder="Additional notes about this influencer..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{borderColor: 'var(--border-muted)'}}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {influencer ? 'Save Changes' : 'Add Influencer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}