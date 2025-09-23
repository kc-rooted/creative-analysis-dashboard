-- Check if the creative exists in the main performance table
SELECT
  content_id,
  representative_creative_name,
  cleaned_creative_name,
  primary_image_url,
  creative_type,
  total_usage_count
FROM `intelligence-451803.jumbomax_analytics.creative_performance_dashboard`
WHERE content_id = 'fb_creative_1227619762463803';

-- Check if there are ANY records in creative_analysis table
SELECT
  COUNT(*) as total_analysis_records,
  COUNT(CASE WHEN analysis_status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN analysis_status = 'analyzing' THEN 1 END) as analyzing_count,
  COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN analysis_status = 'failed' THEN 1 END) as failed_count
FROM `intelligence-451803.jumbomax_analytics.creative_analysis`;

-- Manually insert the missing analysis record to initialize it
INSERT INTO `intelligence-451803.jumbomax_analytics.creative_analysis`
(content_id, analysis_status, created_at, updated_at)
VALUES
('fb_creative_1227619762463803', 'pending', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());