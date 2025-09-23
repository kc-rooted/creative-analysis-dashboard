-- Step 1: Check current status of the stuck creative
SELECT
  content_id,
  analysis_status,
  analysis_date,
  error_message,
  retry_count,
  updated_at,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), updated_at, MINUTE) as minutes_since_update
FROM `intelligence-451803.jumbomax_analytics.creative_analysis`
WHERE content_id = 'fb_creative_1227619762463803';

-- Step 2: Reset the stuck creative (run this after checking status above)
UPDATE `intelligence-451803.jumbomax_analytics.creative_analysis`
SET
  analysis_status = 'pending',
  error_message = 'Reset due to stuck state',
  updated_at = CURRENT_TIMESTAMP()
WHERE content_id = 'fb_creative_1227619762463803'
  AND analysis_status = 'analyzing';

-- Step 3: Check if there are other stuck creatives (analyzing for more than 10 minutes)
SELECT
  content_id,
  analysis_status,
  analysis_date,
  error_message,
  retry_count,
  updated_at,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), updated_at, MINUTE) as minutes_since_update
FROM `intelligence-451803.jumbomax_analytics.creative_analysis`
WHERE analysis_status = 'analyzing'
  AND updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE)
ORDER BY updated_at ASC;