-- SQL to reset any creatives stuck in 'analyzing' status for more than 10 minutes
-- This can be run in BigQuery console if needed

UPDATE `intelligence-451803.jumbomax_analytics.creative_analysis`
SET
  analysis_status = 'pending',
  updated_at = CURRENT_TIMESTAMP()
WHERE analysis_status = 'analyzing'
  AND updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE);