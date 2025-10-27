/**
 * Mock data for Meta Ads Optimization dashboard
 * Used until real BigQuery data is available
 */

export interface AdSetPerformance {
  // Identity
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  date: string;

  // Parsed naming
  role_code: 'CHAMP' | 'BACKUP' | 'TEST';
  role_label: 'Champion' | 'Backup' | 'Testing';
  funnel_stage: 'TOFU' | 'MOFU' | 'BOFU';
  audience_code: 'COLD' | 'WARM' | 'HOT';
  daily_budget: number;

  // Today's performance
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  roas: number;
  ctr: number;
  cvr: number;
  cpc: number;
  frequency: number;

  // Trend (delta from yesterday)
  roas_delta: number;

  // 14-day window
  spend_14d: number;
  purchases_14d: number;
  revenue_14d: number;
  roas_14d: number;
  ctr_14d: number;
  cvr_14d: number;
  days_in_window_14d: number;

  // Stability
  roas_volatility: number;
  avg_frequency_7d: number;

  // Configuration
  days_in_current_role: number;
  role_change_date: string;
}

export interface BayesianPosterior {
  campaign_name: string;
  adset_name: string;
  date: string;

  // Probabilities
  probability_best: number;
  prob_best_delta: number;
  consecutive_days_above_95pct: number;

  probability_above_threshold: number;
  threshold_type: 'champion' | 'backup';
  threshold_value: number;

  // Decision metrics
  expected_loss_daily: number;
  criteria_met: boolean;
  criteria_message: string;
}

export interface CombinedAdSetData extends AdSetPerformance {
  bayesian: BayesianPosterior;
}

// Mock data for 3 campaigns, each with Champion, Backup, and Testing slots
export const MOCK_AD_SETS: CombinedAdSetData[] = [
  // Campaign 1: MF_MOFU_PORTFOLIO
  {
    campaign_name: 'MF_MOFU_PORTFOLIO',
    adset_name: 'MF_CHAMP_WARM_112D',
    ad_name: 'MF_WARM_Video_Testimonial_A',
    date: '2025-10-27',
    role_code: 'CHAMP',
    role_label: 'Champion',
    funnel_stage: 'MOFU',
    audience_code: 'WARM',
    daily_budget: 112,

    // Today
    spend: 112.50,
    impressions: 12640,
    clicks: 216,
    purchases: 4,
    revenue: 947.50,
    roas: 8.42,
    ctr: 1.71,
    cvr: 1.85,
    cpc: 0.52,
    frequency: 2.8,
    roas_delta: 0.8,

    // 14-day
    spend_14d: 1568.00,
    purchases_14d: 47,
    revenue_14d: 13971.20,
    roas_14d: 8.91,
    ctr_14d: 1.68,
    cvr_14d: 1.92,
    days_in_window_14d: 14,

    // Stability
    roas_volatility: 0.42,
    avg_frequency_7d: 2.9,

    // Config
    days_in_current_role: 18,
    role_change_date: '2025-10-09',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_MOFU_PORTFOLIO',
      adset_name: 'MF_CHAMP_WARM_112D',
      date: '2025-10-27',
      probability_best: 0.968,
      prob_best_delta: 0.021,
      consecutive_days_above_95pct: 3,
      probability_above_threshold: 0.942,
      threshold_type: 'champion',
      threshold_value: 8.0,
      expected_loss_daily: 12.40,
      criteria_met: true,
      criteria_message: 'Champion Criteria Met (3 consecutive days > 95%)'
    }
  },
  {
    campaign_name: 'MF_MOFU_PORTFOLIO',
    adset_name: 'MF_BACKUP_WARM_56D',
    ad_name: 'MF_WARM_Carousel_Benefits_B',
    date: '2025-10-27',
    role_code: 'BACKUP',
    role_label: 'Backup',
    funnel_stage: 'MOFU',
    audience_code: 'WARM',
    daily_budget: 56,

    // Today
    spend: 56.25,
    impressions: 8450,
    clicks: 142,
    purchases: 2,
    revenue: 412.00,
    roas: 7.32,
    ctr: 1.68,
    cvr: 1.41,
    cpc: 0.40,
    frequency: 2.4,
    roas_delta: -0.3,

    // 14-day
    spend_14d: 784.00,
    purchases_14d: 28,
    revenue_14d: 5712.00,
    roas_14d: 7.29,
    ctr_14d: 1.72,
    cvr_14d: 1.48,
    days_in_window_14d: 14,

    // Stability
    roas_volatility: 0.38,
    avg_frequency_7d: 2.5,

    // Config
    days_in_current_role: 28,
    role_change_date: '2025-09-29',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_MOFU_PORTFOLIO',
      adset_name: 'MF_BACKUP_WARM_56D',
      date: '2025-10-27',
      probability_best: 0.124,
      prob_best_delta: -0.015,
      consecutive_days_above_95pct: 0,
      probability_above_threshold: 0.881,
      threshold_type: 'backup',
      threshold_value: 6.0,
      expected_loss_daily: 34.20,
      criteria_met: true,
      criteria_message: 'Backup Criteria Met (ROAS > 6.0x for 7+ days)'
    }
  },
  {
    campaign_name: 'MF_MOFU_PORTFOLIO',
    adset_name: 'MF_TEST_WARM_28D',
    ad_name: 'MF_WARM_Static_Social_C',
    date: '2025-10-27',
    role_code: 'TEST',
    role_label: 'Testing',
    funnel_stage: 'MOFU',
    audience_code: 'WARM',
    daily_budget: 28,

    // Today
    spend: 28.10,
    impressions: 4210,
    clicks: 68,
    purchases: 1,
    revenue: 189.00,
    roas: 6.72,
    ctr: 1.62,
    cvr: 1.47,
    cpc: 0.41,
    frequency: 1.9,
    roas_delta: 1.2,

    // 14-day (only 7 days active)
    spend_14d: 196.70,
    purchases_14d: 7,
    revenue_14d: 1323.00,
    roas_14d: 6.72,
    ctr_14d: 1.58,
    cvr_14d: 1.52,
    days_in_window_14d: 7,

    // Stability
    roas_volatility: 1.24,
    avg_frequency_7d: 1.8,

    // Config
    days_in_current_role: 7,
    role_change_date: '2025-10-20',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_MOFU_PORTFOLIO',
      adset_name: 'MF_TEST_WARM_28D',
      date: '2025-10-27',
      probability_best: 0.082,
      prob_best_delta: 0.018,
      consecutive_days_above_95pct: 0,
      probability_above_threshold: 0.524,
      threshold_type: 'backup',
      threshold_value: 6.0,
      expected_loss_daily: 52.80,
      criteria_met: false,
      criteria_message: 'Testing - Needs 7 more days for promotion consideration'
    }
  },

  // Campaign 2: MF_BOFU_PORTFOLIO
  {
    campaign_name: 'MF_BOFU_PORTFOLIO',
    adset_name: 'MF_CHAMP_HOT_84D',
    ad_name: 'MF_HOT_Offer_Limited_Time_A',
    date: '2025-10-27',
    role_code: 'CHAMP',
    role_label: 'Champion',
    funnel_stage: 'BOFU',
    audience_code: 'HOT',
    daily_budget: 84,

    // Today
    spend: 84.00,
    impressions: 6840,
    clicks: 198,
    purchases: 6,
    revenue: 1092.00,
    roas: 13.00,
    ctr: 2.89,
    cvr: 3.03,
    cpc: 0.42,
    frequency: 3.2,
    roas_delta: 1.5,

    // 14-day
    spend_14d: 1176.00,
    purchases_14d: 68,
    revenue_14d: 14688.00,
    roas_14d: 12.49,
    ctr_14d: 2.92,
    cvr_14d: 2.98,
    days_in_window_14d: 14,

    // Stability
    roas_volatility: 0.89,
    avg_frequency_7d: 3.1,

    // Config
    days_in_current_role: 42,
    role_change_date: '2025-09-15',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_BOFU_PORTFOLIO',
      adset_name: 'MF_CHAMP_HOT_84D',
      date: '2025-10-27',
      probability_best: 0.992,
      prob_best_delta: 0.004,
      consecutive_days_above_95pct: 21,
      probability_above_threshold: 0.978,
      threshold_type: 'champion',
      threshold_value: 8.0,
      expected_loss_daily: 8.20,
      criteria_met: true,
      criteria_message: 'Champion Criteria Met (21 consecutive days > 95%)'
    }
  },
  {
    campaign_name: 'MF_BOFU_PORTFOLIO',
    adset_name: 'MF_BACKUP_HOT_42D',
    ad_name: 'MF_HOT_Testimonial_Video_B',
    date: '2025-10-27',
    role_code: 'BACKUP',
    role_label: 'Backup',
    funnel_stage: 'BOFU',
    audience_code: 'HOT',
    daily_budget: 42,

    // Today
    spend: 42.00,
    impressions: 3920,
    clicks: 102,
    purchases: 2,
    revenue: 294.00,
    roas: 7.00,
    ctr: 2.60,
    cvr: 1.96,
    cpc: 0.41,
    frequency: 2.8,
    roas_delta: -0.4,

    // 14-day
    spend_14d: 588.00,
    purchases_14d: 31,
    revenue_14d: 4340.00,
    roas_14d: 7.38,
    ctr_14d: 2.68,
    cvr_14d: 2.12,
    days_in_window_14d: 14,

    // Stability
    roas_volatility: 0.52,
    avg_frequency_7d: 2.7,

    // Config
    days_in_current_role: 14,
    role_change_date: '2025-10-13',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_BOFU_PORTFOLIO',
      adset_name: 'MF_BACKUP_HOT_42D',
      date: '2025-10-27',
      probability_best: 0.052,
      prob_best_delta: -0.008,
      consecutive_days_above_95pct: 0,
      probability_above_threshold: 0.792,
      threshold_type: 'backup',
      threshold_value: 6.0,
      expected_loss_daily: 41.60,
      criteria_met: true,
      criteria_message: 'Backup Criteria Met (ROAS > 6.0x for 7+ days)'
    }
  },
  {
    campaign_name: 'MF_BOFU_PORTFOLIO',
    adset_name: 'MF_TEST_HOT_21D',
    ad_name: 'MF_HOT_Urgency_Static_C',
    date: '2025-10-27',
    role_code: 'TEST',
    role_label: 'Testing',
    funnel_stage: 'BOFU',
    audience_code: 'HOT',
    daily_budget: 21,

    // Today
    spend: 21.00,
    impressions: 2140,
    clicks: 58,
    purchases: 1,
    revenue: 98.00,
    roas: 4.67,
    ctr: 2.71,
    cvr: 1.72,
    cpc: 0.36,
    frequency: 1.6,
    roas_delta: -0.8,

    // 14-day (only 4 days active)
    spend_14d: 84.00,
    purchases_14d: 4,
    revenue_14d: 392.00,
    roas_14d: 4.67,
    ctr_14d: 2.82,
    cvr_14d: 1.89,
    days_in_window_14d: 4,

    // Stability
    roas_volatility: 1.89,
    avg_frequency_7d: 1.5,

    // Config
    days_in_current_role: 4,
    role_change_date: '2025-10-23',

    // Bayesian
    bayesian: {
      campaign_name: 'MF_BOFU_PORTFOLIO',
      adset_name: 'MF_TEST_HOT_21D',
      date: '2025-10-27',
      probability_best: 0.012,
      prob_best_delta: -0.002,
      consecutive_days_above_95pct: 0,
      probability_above_threshold: 0.218,
      threshold_type: 'backup',
      threshold_value: 6.0,
      expected_loss_daily: 78.40,
      criteria_met: false,
      criteria_message: 'Testing - Below threshold, consider pausing'
    }
  }
];

export function getAdSetsByCampaign(campaignName: string): CombinedAdSetData[] {
  return MOCK_AD_SETS.filter(ad => ad.campaign_name === campaignName);
}

export function getAllCampaigns(): string[] {
  return Array.from(new Set(MOCK_AD_SETS.map(ad => ad.campaign_name)));
}

export function getAdSetByName(adsetName: string): CombinedAdSetData | undefined {
  return MOCK_AD_SETS.find(ad => ad.adset_name === adsetName);
}
