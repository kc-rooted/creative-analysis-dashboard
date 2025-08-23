import { BigQuery } from '@google-cloud/bigquery';
import { getCurrentClientConfigSync, CLIENT_CONFIGS } from './client-config';

// Initialize BigQuery client (same for all clients)
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Get current client's dataset
function getCurrentDataset() {
  const clientConfig = getCurrentClientConfigSync();
  return bigquery.dataset(clientConfig.bigquery.dataset);
}

// Helper to get current dataset name safely
function getCurrentDatasetName(): string {
  try {
    const clientConfig = getCurrentClientConfigSync();
    return clientConfig.bigquery.dataset;
  } catch (error) {
    console.error('Error getting client config, falling back to environment variable:', error);
    // Fallback to hardcoded dataset if client config fails
    return process.env.BIGQUERY_DATASET || 'jumbomax_analytics';
  }
}

// Helper to build table reference with current client config
function getTableReference(tableName: string): string {
  const datasetName = getCurrentDatasetName();
  return `\`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${datasetName}.${tableName}\``;
}

export interface Creative {
  content_id: string;
  representative_creative_name: string;
  cleaned_creative_name?: string;
  primary_image_url: string;
  thumbnail_url?: string;
  video_id?: string;
  total_usage_count: number;
  total_campaigns: number;
  all_creative_ids: string[];
  platforms_used: string[];
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis_priority: number;
  roas?: number;
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
  sortBy: 'priority' | 'date' | 'usage' | 'roas' | 'analyzed' = 'roas'
): Promise<Creative[]> {
  let query = `
    SELECT DISTINCT
      cpd.content_id,
      IFNULL(cpd.representative_creative_name, '') as representative_creative_name,
      IFNULL(cpd.cleaned_creative_name, '') as cleaned_creative_name,
      IFNULL(cpd.primary_image_url, '') as primary_image_url,
      cpd.thumbnail_url,
      cpd.video_id,
      IFNULL(cpd.total_usage_count, 0) as total_usage_count,
      IFNULL(cpd.total_campaigns, 0) as total_campaigns,
      [] as all_creative_ids,
      IFNULL(cpd.platforms_used, []) as platforms_used,
      IFNULL(ca.analysis_status, 'pending') as analysis_status,
      IFNULL(ca.analysis_priority, 0) as analysis_priority,
      IFNULL(cpd.roas, 0) as roas,
      IFNULL(ca.creative_tags, []) as creative_tags,
      IFNULL(ca.themes, []) as themes,
      IFNULL(ca.brand_elements, []) as brand_elements,
      IFNULL(ca.color_palette, []) as color_palette,
      ca.sentiment,
      ca.visual_style,
      ca.messaging_tone,
      ca.target_audience,
      ca.confidence_score,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.last_seen) as last_updated,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', cpd.first_seen) as first_seen,
      
      -- Add fields needed for ORDER BY when using DISTINCT
      ca.analysis_priority,
      cpd.last_seen as last_seen_raw,
      cpd.total_campaigns as total_campaigns_sort,
      cpd.total_usage_count as total_usage_count_sort,
      cpd.roas as roas_sort,
      ca.analysis_date as analysis_date_sort
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
      ON cpd.content_id = ca.content_id
  `;

  query += ` WHERE cpd.creative_type != 'NO_VISUAL'`;
  
  if (status) {
    query += ` AND ca.analysis_status = @status`;
  }

  switch (sortBy) {
    case 'priority':
      query += ' ORDER BY analysis_priority DESC';
      break;
    case 'date':
      query += ' ORDER BY last_seen_raw DESC';
      break;
    case 'usage':
      query += ' ORDER BY total_campaigns_sort DESC, total_usage_count_sort DESC';
      break;
    case 'roas':
      query += ' ORDER BY roas_sort DESC';
      break;
    case 'analyzed':
      query += ' ORDER BY analysis_date_sort DESC';
      break;
  }

  query += ` LIMIT @limit OFFSET @offset`;

  const params: any = {
    limit,
    offset,
  };

  // Only add status to params if it's defined
  if (status) {
    params.status = status;
  }

  const options = {
    query,
    params,
  };

  const [rows] = await bigquery.query(options);
  return rows as Creative[];
}

export async function getAnalysisStatistics(): Promise<AnalysisStats[]> {
  const query = `
    SELECT 
      'pending' as analysis_status,
      COUNT(DISTINCT cpd.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
      ON cpd.content_id = ca.content_id
    WHERE cpd.creative_type != 'NO_VISUAL' 
      AND cpd.video_id IS NULL
      AND (ca.content_id IS NULL OR ca.analysis_status IS NULL OR ca.analysis_status = 'pending')
    
    UNION ALL
    
    SELECT 
      ca.analysis_status,
      COUNT(DISTINCT ca.content_id) as unique_images,
      CAST(IFNULL(SUM(cpd.total_campaigns), 0) AS INT64) as total_campaign_impact
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\` ca
    JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_performance_dashboard\` cpd
      ON ca.content_id = cpd.content_id
    WHERE cpd.creative_type != 'NO_VISUAL' 
      AND cpd.video_id IS NULL
      AND ca.analysis_status IS NOT NULL AND ca.analysis_status != 'pending'
    GROUP BY ca.analysis_status
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
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.unified_creative_inventory\`
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
    UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${getCurrentDatasetName()}.creative_analysis\`
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

// Function for conversation tools to execute SQL queries (from intelligence-ai)
export async function runSQLQuery(sql: string) {
  try {
    // Timeout for long-running queries
    const queryOptions = {
      query: sql,
      timeoutMs: 30000, // 30 seconds timeout
    };
    
    const [rows] = await bigquery.query(queryOptions);
    return rows;
  } catch (error) {
    console.error('BigQuery Error:', error);
    // Enhance error message with specific BigQuery errors
    if (error instanceof Error) {
      if (error.message.includes('Not found')) {
        throw new Error('Table or dataset not found');
      } else if (error.message.includes('Syntax error')) {
        throw new Error(`SQL syntax error: ${error.message}`);
      } else if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied for this query');
      }
    }
    // Re-throw for the tool's catch block to handle
    throw error;
  }
}

export async function runSchemaQuery(sql: string) {
  try {
    const [rows] = await bigquery.query(sql);
    return rows;
  } catch (error) {
    console.error('Schema Query Error:', error);
    throw error;
  }
}