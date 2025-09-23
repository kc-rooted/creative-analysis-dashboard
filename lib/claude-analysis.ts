import { Anthropic } from '@anthropic-ai/sdk';
import { getCurrentClientConfigSync, generateClientContext } from './client-config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ColorDetail {
  color_name: string;
  hex_code: string;
  description: string;
  percentage: number;
  role: string;
}

export interface ClaudeAnalysisResponse {
  analysis_text: string;
  creative_format: string;
  confidence_score: number;
  creative_tags: string[];
  themes: string[];
  color_palette: string[];
  color_palette_detailed: ColorDetail[];
  visual_style: string;
  messaging_tone: string;
  sentiment: string;
  target_audience: string;
  product_focus: string;
  call_to_action: string;
  brand_elements: string[];
}

export async function analyzeCreativeWithClaude(
  imageUrl: string,
  creative: {
    content_id: string;
    cleaned_creative_name?: string;
    representative_creative_name?: string;
    representative_ad_text?: string;
    total_usage_count?: number;
  }
): Promise<ClaudeAnalysisResponse> {
  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    // Detect image type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const creativeName = creative.cleaned_creative_name || creative.representative_creative_name || 'campaign';
    const adText = creative.representative_ad_text ? `\n\nAd copy text: "${creative.representative_ad_text}"` : '';
    const usageInfo = creative.total_usage_count ? `\n\nThis creative is used in ${creative.total_usage_count} campaigns.` : '';
    
    // Get client-specific configuration
    const clientConfig = getCurrentClientConfigSync();
    const clientContext = generateClientContext(clientConfig);

    const prompt = `Analyze this advertising creative for ${creativeName}.${adText}${usageInfo}

${clientContext}

Provide analysis in this EXACT JSON format:

{
  "analysis_text": "Comprehensive 3-4 sentence analysis covering visual design, messaging strategy, and overall effectiveness",
  "creative_format": "static_image|video|carousel|story|display_banner",
  "confidence_score": 0.95,
  "creative_tags": ["visual_style_tag", "industry_vertical", "emotional_tone", "design_elements"],
  "themes": ["performance", "quality", "innovation", "lifestyle"],
  "color_palette": ["navy_blue", "accent_white", "text_gray"],
  "color_palette_detailed": [
    {
      "color_name": "navy_blue",
      "hex_code": "#1B4F72", 
      "description": "professional_brand_blue",
      "percentage": 40,
      "role": "primary_brand"
    },
    {
      "color_name": "accent_white",
      "hex_code": "#FFFFFF", 
      "description": "clean_background_white",
      "percentage": 35,
      "role": "background"
    },
    {
      "color_name": "text_gray",
      "hex_code": "#2C3E50", 
      "description": "primary_text_color",
      "percentage": 25,
      "role": "text"
    }
  ],
  "visual_style": "clean_modern|bold_dynamic|minimal_elegant|sporty_energetic|luxury_premium",
  "messaging_tone": "confident_authoritative|friendly_approachable|urgent_compelling|educational_informative",
  "sentiment": "positive|neutral|negative",
  "target_audience": "golf_enthusiasts|performance_athletes|luxury_consumers|beginners",
  "product_focus": "golf_grips|equipment|accessories|lifestyle",
  "call_to_action": "extracted_cta_text_or_implied_action",
  "brand_elements": ["logo_present", "brand_colors_used", "consistent_typography", "product_showcase"]
}

Return ONLY the JSON object, no additional text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Parse the JSON response
    const analysisResult = JSON.parse(responseText);
    
    // Validate the response has required fields
    if (!analysisResult.analysis_text || !analysisResult.confidence_score) {
      throw new Error('Invalid Claude response: missing required fields');
    }

    return analysisResult as ClaudeAnalysisResponse;

  } catch (error) {
    console.error('Error in Claude analysis:', error);
    throw error;
  }
}

export async function updateCreativeAnalysis(
  contentId: string,
  analysisData: ClaudeAnalysisResponse
): Promise<void> {
  const { BigQuery } = require('@google-cloud/bigquery');
  
  // Get client-specific dataset
  const clientConfig = getCurrentClientConfigSync();
  const bigquery = new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
      : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    ),
  });

  try {
    // First, try to insert or update using MERGE
    const query = `
      MERGE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_analysis\` AS target
      USING (SELECT @content_id AS content_id) AS source
      ON target.content_id = source.content_id
      WHEN MATCHED THEN
        UPDATE SET 
          analysis_status = 'completed',
          analysis_date = CURRENT_TIMESTAMP(),
          claude_model_used = 'claude-3-5-haiku-20241022',
          analysis_text = @analysis_text,
          creative_format = @creative_format,
          confidence_score = @confidence_score,
          creative_tags = @creative_tags,
          themes = @themes,
          color_palette = @color_palette,
          color_palette_detailed = PARSE_JSON(@color_palette_detailed_json),
          visual_style = @visual_style,
          messaging_tone = @messaging_tone,
          sentiment = @sentiment,
          target_audience = @target_audience,
          product_focus = @product_focus,
          call_to_action = @call_to_action,
          brand_elements = @brand_elements,
          error_message = NULL,
          retry_count = COALESCE(retry_count, 0),
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          content_id, analysis_status, analysis_date, claude_model_used,
          analysis_text, creative_format, confidence_score, creative_tags,
          themes, color_palette, color_palette_detailed, visual_style,
          messaging_tone, sentiment, target_audience, product_focus,
          call_to_action, brand_elements, retry_count, updated_at, created_at
        )
        VALUES (
          @content_id, 'completed', CURRENT_TIMESTAMP(), 'claude-3-5-haiku-20241022',
          @analysis_text, @creative_format, @confidence_score, @creative_tags,
          @themes, @color_palette, PARSE_JSON(@color_palette_detailed_json), @visual_style,
          @messaging_tone, @sentiment, @target_audience, @product_focus,
          @call_to_action, @brand_elements, 0, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
        )
    `;

    const queryParams = {
      content_id: contentId,
      analysis_text: analysisData.analysis_text,
      creative_format: analysisData.creative_format,
      confidence_score: analysisData.confidence_score,
      creative_tags: analysisData.creative_tags,
      themes: analysisData.themes,
      color_palette: analysisData.color_palette,
      color_palette_detailed_json: JSON.stringify(analysisData.color_palette_detailed),
      visual_style: analysisData.visual_style,
      messaging_tone: analysisData.messaging_tone,
      sentiment: analysisData.sentiment,
      target_audience: analysisData.target_audience,
      product_focus: analysisData.product_focus,
      call_to_action: analysisData.call_to_action,
      brand_elements: analysisData.brand_elements,
    };

    await bigquery.query({ query, params: queryParams });
    console.log(`✅ Updated analysis for content_id: ${contentId}`);

  } catch (error) {
    console.error(`❌ Failed to update analysis for ${contentId}:`, error);
    
    // Handle errors and update error fields
    await bigquery.query({
      query: `
        UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_analysis\`
        SET 
          analysis_status = 'failed',
          error_message = @error_message,
          retry_count = COALESCE(retry_count, 0) + 1,
          updated_at = CURRENT_TIMESTAMP()
        WHERE content_id = @content_id
      `,
      params: {
        content_id: contentId,
        error_message: error.message.substring(0, 500),
      },
    });
    
    throw error;
  }
}

export async function processCreativesForAnalysis(limit: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ content_id: string; error: string }>;
}> {
  const { BigQuery } = require('@google-cloud/bigquery');
  
  const bigquery = new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    ...(process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) }
      : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    ),
  });

  // Get client-specific dataset
  const clientConfig = getCurrentClientConfigSync();

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ content_id: string; error: string }>,
  };

  try {
    // Get pending creatives ordered by priority (exclude videos and NO_VISUAL)
    const query = `
      SELECT DISTINCT
        cpd.content_id,
        cpd.primary_image_url,
        cpd.cleaned_creative_name,
        cpd.representative_creative_name,
        cpd.representative_ad_text,
        ca.analysis_priority,
        cpd.total_usage_count,
        ca.retry_count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_performance_dashboard\` cpd
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_analysis\` ca 
        ON cpd.content_id = ca.content_id
      WHERE (ca.analysis_status = 'pending' OR ca.analysis_status IS NULL)
        AND (ca.retry_count IS NULL OR ca.retry_count < 3)
        AND cpd.primary_image_url IS NOT NULL 
        AND cpd.primary_image_url != ''
        AND cpd.video_id IS NULL
        AND cpd.creative_type != 'NO_VISUAL'
      ORDER BY COALESCE(ca.analysis_priority, 0) DESC, cpd.total_usage_count DESC
      LIMIT @limit
    `;

    const [rows] = await bigquery.query({
      query,
      params: { limit },
    });

    console.log(`🎯 Found ${rows.length} creatives to analyze`);

    for (const creative of rows) {
      results.processed++;
      
      try {
        // Mark as analyzing
        await bigquery.query({
          query: `
            MERGE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_analysis\` AS target
            USING (SELECT @content_id AS content_id) AS source
            ON target.content_id = source.content_id
            WHEN MATCHED THEN
              UPDATE SET analysis_status = 'analyzing', updated_at = CURRENT_TIMESTAMP()
            WHEN NOT MATCHED THEN
              INSERT (content_id, analysis_status, created_at, updated_at)
              VALUES (@content_id, 'analyzing', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
          `,
          params: { content_id: creative.content_id },
        });

        console.log(`🔍 Analyzing: ${creative.content_id}`);
        
        const analysisResult = await analyzeCreativeWithClaude(
          creative.primary_image_url,
          creative
        );

        await updateCreativeAnalysis(creative.content_id, analysisResult);
        
        results.successful++;
        console.log(`✅ Successfully analyzed: ${creative.content_id}`);

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          content_id: creative.content_id,
          error: errorMessage,
        });
        
        console.error(`❌ Failed to analyze ${creative.content_id}:`, errorMessage);
        
        // Update status to failed
        try {
          await bigquery.query({
            query: `
              UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${clientConfig.bigquery.dataset}.creative_analysis\`
              SET 
                analysis_status = 'failed',
                error_message = @error_message,
                retry_count = COALESCE(retry_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP()
              WHERE content_id = @content_id
            `,
            params: {
              content_id: creative.content_id,
              error_message: errorMessage,
            },
          });
        } catch (updateError) {
          console.error('Failed to update error status:', updateError);
        }
      }
    }

    return results;

  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}