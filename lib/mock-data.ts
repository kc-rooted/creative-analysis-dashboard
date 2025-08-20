import type { Creative, AnalysisStats } from './bigquery';

export const mockCreatives: Creative[] = [
  {
    content_id: 'img_001',
    representative_creative_name: 'Summer Sale Banner - Beach Theme',
    primary_image_url: 'https://via.placeholder.com/400x300/4F46E5/ffffff?text=Summer+Sale',
    thumbnail_url: 'https://via.placeholder.com/200x150/4F46E5/ffffff?text=Summer+Sale',
    total_usage_count: 45,
    all_creative_ids: ['fb_creative_123', 'fb_creative_456', 'fb_creative_789'],
    platforms_used: ['facebook', 'google_ads'],
    analysis_status: 'completed',
    analysis_priority: 95,
    creative_tags: ['summer', 'sale', 'beach', 'vacation', 'discount'],
    themes: ['seasonal', 'promotional'],
    brand_elements: ['logo', 'tagline'],
    color_palette: ['blue', 'orange', 'white'],
    sentiment: 'positive',
    visual_style: 'modern',
    messaging_tone: 'promotional',
    target_audience: 'millennials',
    confidence_score: 0.92,
    last_updated: '2024-01-15 10:30:00',
    first_seen: '2024-01-01 08:00:00'
  },
  {
    content_id: 'img_002',
    representative_creative_name: 'Product Launch - Tech Gadget',
    primary_image_url: 'https://via.placeholder.com/400x300/10B981/ffffff?text=New+Product',
    thumbnail_url: 'https://via.placeholder.com/200x150/10B981/ffffff?text=New+Product',
    total_usage_count: 62,
    all_creative_ids: ['gads_001', 'gads_002', 'gads_003', 'gads_004'],
    platforms_used: ['google_ads'],
    analysis_status: 'pending',
    analysis_priority: 100,
    creative_tags: [],
    themes: [],
    brand_elements: [],
    color_palette: [],
    last_updated: '2024-01-16 14:20:00',
    first_seen: '2024-01-10 09:00:00'
  },
  {
    content_id: 'img_003',
    representative_creative_name: 'Holiday Special Offer',
    primary_image_url: 'https://via.placeholder.com/400x300/EF4444/ffffff?text=Holiday+Special',
    thumbnail_url: 'https://via.placeholder.com/200x150/EF4444/ffffff?text=Holiday+Special',
    total_usage_count: 28,
    all_creative_ids: ['fb_creative_901', 'fb_creative_902'],
    platforms_used: ['facebook'],
    analysis_status: 'analyzing',
    analysis_priority: 85,
    creative_tags: ['holiday', 'special', 'offer'],
    themes: ['seasonal'],
    brand_elements: ['logo'],
    color_palette: ['red', 'green', 'gold'],
    sentiment: 'positive',
    visual_style: 'festive',
    messaging_tone: 'emotional',
    last_updated: '2024-01-14 11:45:00',
    first_seen: '2024-01-05 10:00:00'
  },
  {
    content_id: 'img_004',
    representative_creative_name: 'Flash Sale - 24 Hours Only',
    primary_image_url: 'https://via.placeholder.com/400x300/F59E0B/ffffff?text=Flash+Sale',
    thumbnail_url: 'https://via.placeholder.com/200x150/F59E0B/ffffff?text=Flash+Sale',
    total_usage_count: 15,
    all_creative_ids: ['fb_creative_111', 'gads_222'],
    platforms_used: ['facebook', 'google_ads'],
    analysis_status: 'failed',
    analysis_priority: 70,
    creative_tags: [],
    themes: [],
    brand_elements: [],
    color_palette: [],
    last_updated: '2024-01-13 16:00:00',
    first_seen: '2024-01-12 12:00:00'
  },
  {
    content_id: 'img_005',
    representative_creative_name: 'Brand Awareness Campaign',
    primary_image_url: 'https://via.placeholder.com/400x300/8B5CF6/ffffff?text=Brand+Campaign',
    thumbnail_url: 'https://via.placeholder.com/200x150/8B5CF6/ffffff?text=Brand+Campaign',
    total_usage_count: 88,
    all_creative_ids: ['fb_creative_aaa', 'fb_creative_bbb', 'fb_creative_ccc', 'gads_ddd', 'gads_eee'],
    platforms_used: ['facebook', 'google_ads'],
    analysis_status: 'completed',
    analysis_priority: 60,
    creative_tags: ['brand', 'awareness', 'lifestyle', 'premium'],
    themes: ['brand building', 'lifestyle'],
    brand_elements: ['logo', 'slogan', 'brand colors'],
    color_palette: ['purple', 'white', 'gray'],
    sentiment: 'neutral',
    visual_style: 'minimalist',
    messaging_tone: 'educational',
    target_audience: 'general',
    confidence_score: 0.88,
    last_updated: '2024-01-17 09:15:00',
    first_seen: '2024-01-02 07:30:00'
  }
];

export const mockStats: AnalysisStats[] = [
  {
    analysis_status: 'completed',
    unique_images: 342,
    total_campaign_impact: 4521
  },
  {
    analysis_status: 'pending',
    unique_images: 456,
    total_campaign_impact: 3987
  },
  {
    analysis_status: 'analyzing',
    unique_images: 12,
    total_campaign_impact: 89
  },
  {
    analysis_status: 'failed',
    unique_images: 58,
    total_campaign_impact: 412
  }
];