import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset(process.env.BIGQUERY_DATASET || 'jumbomax_analytics');

export interface Creative {
  content_id: string;
  representative_creative_name: string;
  primary_image_url: string;
  thumbnail_url?: string;
  total_usage_count: number;
  all_creative_ids: string[];
  platforms_used: string[];
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis_priority: number;
  creative_tags?: string[];
  themes?: string[];
  brand_elements?: string[];
  color_palette?: string[];
  sentiment?: string;
  visual_style?: string;
  messaging_tone?: string;
  target_audience?: string;
  confidence_score?: number;
  last_updated?: string;
  first_seen?: string;
}

export interface AnalysisStats {
  analysis_status: string;
  unique_images: number;
  total_campaign_impact: number;
}

export interface CampaignUsage {
  creative_id: string;
  creative_name: string;
  platform: string;
  ad_text?: string;
  ad_title?: string;
  last_updated: string;
}

export async function getDeduplicatedCreatives(
  status?: string,
  limit: number = 50,
  offset: number = 0,
  sortBy: 'priority' | 'date' | 'usage' = 'priority'
): Promise<Creative[]> {
  let query = `
    SELECT 
      content_id,
      representative_creative_name,
      primary_image_url,
      thumbnail_url,
      total_usage_count,
      all_creative_ids,
      platforms_used,
      analysis_status,
      analysis_priority,
      creative_tags,
      themes,
      brand_elements,
      color_palette,
      sentiment,
      visual_style,
      messaging_tone,
      target_audience,
      confidence_score,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', last_updated) as last_updated,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_seen) as first_seen
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.deduplicated_creative_analysis\`
  `;

  if (status) {
    query += ` WHERE analysis_status = @status`;
  }

  switch (sortBy) {
    case 'priority':
      query += ' ORDER BY analysis_priority DESC';
      break;
    case 'date':
      query += ' ORDER BY last_updated DESC';
      break;
    case 'usage':
      query += ' ORDER BY total_usage_count DESC';
      break;
  }

  query += ` LIMIT @limit OFFSET @offset`;

  const options = {
    query,
    params: {
      status,
      limit,
      offset,
    },
  };

  const [rows] = await bigquery.query(options);
  return rows as Creative[];
}

export async function getAnalysisStatistics(): Promise<AnalysisStats[]> {
  const query = `
    SELECT 
      analysis_status,
      COUNT(*) as unique_images,
      SUM(total_usage_count) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.deduplicated_creative_analysis\`
    GROUP BY analysis_status
  `;

  const [rows] = await bigquery.query(query);
  return rows as AnalysisStats[];
}

export async function getCampaignUsage(imageUrl: string): Promise<CampaignUsage[]> {
  const query = `
    SELECT 
      creative_id,
      creative_name,
      platform,
      ad_text,
      ad_title,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', last_updated) as last_updated
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.unified_creative_inventory\`
    WHERE primary_image_url = @imageUrl
    ORDER BY last_updated DESC
  `;

  const options = {
    query,
    params: { imageUrl },
  };

  const [rows] = await bigquery.query(options);
  return rows as CampaignUsage[];
}

export async function updateAnalysisStatus(
  creativeId: string,
  status: 'analyzing' | 'completed' | 'failed',
  analysisData?: any
) {
  const table = dataset.table('creative_analysis');

  const row = {
    creative_id: creativeId,
    analysis_status: status,
    analysis_timestamp: new Date().toISOString(),
    ...(analysisData || {}),
  };

  await table.insert([row]);
}

export async function triggerAnalysis(contentIds: string[]): Promise<void> {
  // Mark creatives for analysis
  for (const contentId of contentIds) {
    await updateAnalysisStatus(contentId, 'analyzing');
  }
}

export async function updateCreativeTags(
  contentId: string,
  tags: string[]
): Promise<void> {
  const query = `
    UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.creative_analysis\`
    SET creative_tags = @tags,
        last_updated = CURRENT_TIMESTAMP()
    WHERE content_id = @contentId
  `;

  const options = {
    query,
    params: { contentId, tags },
  };

  await bigquery.query(options);
}