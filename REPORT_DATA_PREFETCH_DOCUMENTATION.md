# Report Data Pre-Fetch Documentation

## Overview
This document outlines all BigQuery views, tables, and timeframes accessed during the report data pre-fetch process. The pre-fetch system loads all necessary data BEFORE the Claude API call to minimize token usage and improve performance.

**API Endpoint:** `/api/reports/fetch-data`
**Max Duration:** 60 seconds
**Purpose:** Pre-load all analytics data needed for a specific report type

---

## Period/Timeframe Options

The system supports the following period parameters:

| Period | Timeframe | Calculation |
|--------|-----------|-------------|
| `7d` | Last 7 days | Current date - 7 days |
| `30d` | Last 30 days | Current date - 30 days |
| `mtd` | Month-to-date | First day of current month to today |
| `ytd` | Year-to-date | January 1st to today |
| `previous-month` | Full previous month | First to last day of previous month (e.g., Oct 1-31 if today is Nov 3) |

**Default:** `30d` (last 30 days)

---

## Report Types & Data Sources

### 1. Monthly Performance Report (Base)

**Report Type:** `monthly-performance`
**Used By:** Generic monthly reports
**Dataset Pattern:** `{client}_analytics` (e.g., `jumbomax_analytics`, `puttout_analytics`, `hb_analytics`)

#### Views/Tables Accessed:

##### A. Monthly Executive Report
- **View:** `monthly_executive_report`
- **Timeframe:** Previous complete month (< current month start)
- **Limit:** 1 row (most recent month)
- **Key Fields:**
  - `revenue_total`, `revenue_mom_pct`, `revenue_yoy_pct`
  - `paid_revenue_total`, `paid_revenue_mom_pct`, `paid_revenue_yoy_pct`
  - `paid_spend_total`, `paid_spend_mom_pct`, `paid_spend_yoy_pct`
  - `attributed_blended_roas`, MoM/YoY changes
  - `meta_spend`, `meta_revenue`, `meta_roas` with MoM/YoY
  - `google_spend`, `google_revenue`, `google_roas` with MoM/YoY
  - `top_emerging_product_title`, revenue, growth %
- **Purpose:** Hero metrics with month-over-month and year-over-year comparisons

##### B. Executive Summary (MTD Metrics)
- **View:** `ai_executive_summary`
- **Timeframe:** Most recent report date (LIMIT 1)
- **Key Fields:**
  - MTD: `revenue_mtd`, `orders_mtd`, `aov_mtd`
  - YoY Growth: `revenue_mtd_yoy_growth_pct`, `orders_mtd_yoy_growth_pct`
  - Facebook: `facebook_spend_mtd`, `facebook_revenue_mtd`, `facebook_roas_mtd`
  - Google: `google_spend_mtd`, `google_revenue_mtd`, `google_roas_mtd`
  - Email: `klaviyo_total_revenue_mtd`, YoY growth
  - 7-day metrics for all above
- **Purpose:** Current month-to-date snapshot for context

##### C. Monthly Business Summary
- **Table:** `monthly_business_summary`
- **Timeframe:** Previous complete month (< current month start)
- **Limit:** 1 row (most recent month)
- **Key Fields:**
  - `monthly_gross_sales`, `monthly_net_sales_after_refunds`
  - `monthly_orders`, `avg_monthly_aov`
  - `total_sales_roas`, `attributed_blended_roas`
  - `monthly_ad_spend`, breakdown by platform (FB, Google)
- **Purpose:** Core business metrics for the month

##### D. Campaign Performance (Top & Bottom)
- **View:** `ai_intelligent_campaign_analysis`
- **Timeframe:** 30-day rolling window
- **Limits:** Top 10 by ROAS, Bottom 5 by ROAS
- **Key Fields:**
  - `campaign_name`
  - `spend_30d`, `revenue_30d`, `roas_30d`
  - `ctr_30d`, `purchases_30d`
  - `recommended_action`, `risk_flags`
- **Purpose:** Identify top performers and campaigns needing attention

##### E. Product Intelligence
- **Table:** `product_intelligence`
- **Timeframe:** 30-day rolling window
- **Limit:** Top 10 by revenue
- **Key Fields:**
  - `product_title`
  - `revenue_30d`, `units_sold_30d`
  - `total_inventory_quantity`, `avg_variant_price`
  - `performance_category_30d`
- **Purpose:** Top-selling products and inventory status

##### F. Bayesian Annual Forecast
- **Table:** `bayesian_annual_probability_forecast`
- **Timeframe:** Most recent report date (LIMIT 1)
- **Key Fields:**
  - `forecast_year`, `annual_revenue_target`, `annual_roas_target`
  - `ytd_revenue`, `ytd_attainment_pct`
  - `days_remaining`, `revenue_gap`
  - Prophet forecasts: `base`, `conservative`, `optimistic`
  - Probabilities: `probability_hit_revenue_target`, `probability_hit_roas_target`, `probability_hit_both_targets`
  - `revenue_risk_level`, `performance_vs_pace_pct`
- **Purpose:** Annual revenue pacing and probability analysis

##### G. Daily Performance Progression
- **Table:** `paid_media_performance`
- **Timeframe:** Full month specified by date range (e.g., Oct 1 - Oct 31)
- **SQL Filter:** `date >= '{start}' AND date < DATE_ADD(DATE '{start}', INTERVAL 1 MONTH)`
- **Key Fields:**
  - `date`, `spend`, `revenue`
  - Calculated: `ROAS = revenue / spend`
  - `orders`
- **Purpose:** Daily trend analysis throughout the month

##### H. Geographic Performance
- **Table:** `geographic_product_performance`
- **Timeframe:** Specific month from date range (format: `YYYY-MM`)
- **Filter:** Countries: US, CA, GB (United States, Canada, United Kingdom)
- **Key Fields:**
  - `country`, `country_code`
  - `total_revenue`, `total_units_sold`
  - `avg_unit_price`
- **Purpose:** Revenue distribution by key markets

##### I. Client Configuration
- **Table:** `admin_configs.client_configurations`
- **Filter:** Specific client ID
- **Key Fields:**
  - `id`, `name`
  - `analysis_config` (JSON containing revenue targets)
- **Purpose:** Revenue targets and configuration data

---

### 2. H&B Monthly Performance Report

**Report Type:** `hb-monthly-performance`
**Extends:** Base Monthly Performance Report
**Additional Data:**

##### A. Paid Media Performance (Granular Metrics)
- **Table:** `paid_media_performance`
- **Timeframe:** Full month specified by date range
- **Aggregation:** By platform (Facebook, Google Ads)
- **Key Fields:**
  - Per Platform: `total_spend`, `total_revenue`, `calculated_roas`
  - Impressions: `total_impressions`, `total_reach`
  - Clicks: `total_clicks`, `calculated_cpm`, `calculated_cpc`, `calculated_ctr`
  - Conversions: `total_purchases`, `avg_conversion_rate`
  - Meta-specific: `avg_frequency`
- **Purpose:** Detailed platform-level performance metrics (CPM, CPC, CTR, etc.)

##### B. Enhanced Country Performance (with Meta Attribution)
- **Tables:**
  - `geographic_product_performance` (Shopify data)
  - `clients_hb.facebook_ads_insights_country` (Meta data)
- **Timeframe:** Specific month from date range (format: `YYYY-MM`)
- **Join:** LEFT JOIN on country_code and year_month
- **Filter:** Countries: US, CA, GB
- **Key Fields (Combined):**
  - From Shopify: `total_revenue`, `total_units_sold`, `avg_unit_price`
  - From Meta: `meta_attributed_revenue`, `meta_spend`, `meta_roas`
- **Purpose:** Geographic revenue with Meta advertising attribution

##### C. Funnel Ads (All-Star Ad Bundles)
- **Table:** `ai_allstar_ad_bundles`
- **Timeframe:** Current/latest data
- **Filtering:** Top 3 ads per funnel stage (TOFU, MOFU, BOFU)
- **Key Fields:**
  - `ad_name`, `recommended_stage`, `all_star_rank`
  - Performance ranks: `roas_rank`, `clicks_rank`, `efficiency_rank`, `ctr_rank`, `conversion_rank`
  - Metrics: `roas`, `ctr_percent`, `cpc`
  - Creative: `image_url`, `video_id`, `thumbnail_url`, `creative_type`
- **Purpose:** Top-performing ads by funnel stage for creative optimization
- **Note:** Data returned but NOT sent to Claude (client-side injection to avoid expired CDN URLs)

---

### 3. JumboMax Monthly Performance Report

**Report Type:** `jumbomax-monthly-performance`
**Extends:** H&B Monthly Performance Report (includes funnel ads)
**Additional Data:** Email/Klaviyo metrics

##### A. Email Performance Overview
- **Table:** `klaviyo_email_engagement_trends`
- **Timeframe:** Full month specified by date range
- **Aggregation:** SUM for volume metrics, AVG for rates
- **Key Fields:**
  - Volume: `total_sends`, `total_deliveries`, `campaigns_sent`, `unique_recipients_sent`
  - Engagement: `total_opens`, `total_clicks`, `unique_recipients_opened`, `unique_recipients_clicked`
  - Rates: `avg_open_rate`, `avg_click_rate`, `avg_click_to_open_rate`, `avg_unique_open_rate`, `avg_unique_click_rate`
  - Performance: `total_attributed_revenue`, `total_attributed_purchases`, `total_attributed_purchasers`, `avg_purchase_conversion_rate`, `avg_revenue_per_send`
  - Deliverability: `total_bounces`, `total_unsubscribes`, `avg_delivery_rate`, `avg_bounce_rate`, `avg_unsubscribe_rate`
- **Purpose:** Overall email marketing performance

##### B. Email Performance by Category
- **Table:** `klaviyo_email_engagement_trends`
- **Timeframe:** Full month specified by date range
- **Group By:** `campaign_category`
- **Order By:** `attributed_revenue DESC`
- **Filter:** `campaign_category IS NOT NULL`
- **Key Fields:**
  - `campaign_category`
  - `sends`, `opens`, `clicks`, `attributed_revenue`
  - `open_rate`, `click_rate`, `click_to_open_rate`
- **Purpose:** Performance comparison across campaign categories

##### C. Email Performance by Type
- **Table:** `klaviyo_email_engagement_trends`
- **Timeframe:** Full month specified by date range
- **Group By:** `email_type` (Campaign vs Flow)
- **Order By:** `attributed_revenue DESC`
- **Filter:** `email_type IS NOT NULL`
- **Key Fields:**
  - `email_type`
  - `sends`, `opens`, `clicks`, `attributed_revenue`
  - `open_rate`, `click_rate`
- **Purpose:** Compare automated flows vs manual campaigns

##### D. Flow Revenue Breakdown
- **Table:** `klaviyo_daily_flow_revenue`
- **Timeframe:** Full month specified by date range
- **Group By:** `flow_name`, `flow_category`
- **Order By:** `attributed_revenue DESC`
- **Key Fields:**
  - `flow_name`, `flow_category`
  - `attributed_purchasers`, `attributed_purchases`, `attributed_revenue`
  - `avg_order_value`, `revenue_per_purchaser`
- **Purpose:** Individual flow performance analysis

---

### 4. PuttOUT Monthly Performance Report

**Report Type:** `puttout-monthly-performance`
**Extends:** Base Monthly Performance Report
**Additional Data:**

Same email metrics as JumboMax (A-D above) plus:

##### A. Paid Media Performance (Meta Only)
- **Table:** `paid_media_performance`
- **Timeframe:** Full month specified by date range
- **Aggregation:** By platform
- **Key Fields:** Same as H&B version but with focus on Facebook/Meta
- **Note:** No detailed Google Ads breakout (unlike H&B)
- **Purpose:** Meta advertising granular metrics

**Note:** No funnel ads data (unlike JumboMax which inherits from H&B)

---

### 5. Weekly Executive Report

**Report Type:** `weekly-executive`
**Status:** Defined but not actively used
**Timeframe:** Based on period parameter (default 30d)

#### Views/Tables:

##### A. Revenue Metrics
- **Table:** `daily_performance`
- **Fields:** `date`, `total_revenue`, `total_orders`
- **Group By:** `date`
- **Order:** Most recent first

##### B. Platform Performance
- **Table:** `platform_daily_metrics`
- **Fields:** `platform`, `spend`, `revenue`, calculated `roas`
- **Group By:** `platform`
- **Order:** By spend DESC

##### C. Top Products
- **Table:** `product_performance`
- **Fields:** `product_name`, `quantity`, `revenue`
- **Limit:** Top 10 by revenue

---

### 6. Platform Deep Dive

**Report Type:** `platform-deep-dive`
**Status:** Defined but not actively used

##### A. Campaign Performance
- **Table:** `campaign_performance`
- **Limit:** Top 20 by spend
- **Fields:** Campaign metrics including spend, revenue, ROAS, CTR, CVR

##### B. Daily Trend
- **Table:** `platform_daily_metrics`
- **Fields:** Daily spend, revenue, clicks, conversions

---

### 7. Email & Retention Report

**Report Type:** `email-retention`
**Status:** Defined but not actively used

##### A. Email Campaigns
- **Table:** `email_campaigns`
- **Limit:** Top 20 by sent count
- **Fields:** Campaign performance metrics

##### B. Customer Retention
- **Table:** `customer_cohorts`
- **Fields:** Cohort retention analysis

---

## Data Flow Summary

### Standard Monthly Report Flow:
```
1. Parse period parameter (e.g., "previous-month")
2. Calculate date range (e.g., Oct 1 - Oct 31, 2025)
3. Query each view/table in sequence:
   - Monthly Executive Report (hero metrics)
   - Executive Summary (MTD context)
   - Business Summary (core metrics)
   - Campaign Analysis (top/bottom performers)
   - Product Intelligence (top SKUs)
   - Bayesian Forecast (annual pacing)
   - Daily Performance (trend data)
   - Geographic Performance (country breakdown)
   - Client Config (targets)
4. Format as markdown for Claude API
5. Return JSON with raw data + formatted markdown
```

### Client-Specific Extensions:
- **H&B:** + Paid Media Granular + Enhanced Country + Funnel Ads
- **JumboMax:** + All H&B data + Email Performance (4 queries)
- **PuttOUT:** + Meta Paid Media + Email Performance (4 queries)

---

## Error Handling

All queries use try-catch blocks. If a query fails:
- Error is logged to console with query key
- Empty array is returned for that data key
- Report generation continues with available data
- Common errors:
  - Table not found (404)
  - Column name mismatch (400)
  - Permission denied
  - Query timeout

---

## Performance Considerations

- **Max Duration:** 60 seconds (API route timeout)
- **Typical Duration:** 15-45 seconds for full report
- **Sequential Execution:** Queries run one at a time (not parallel)
- **Token Optimization:** Data is formatted as compact markdown tables
- **Caching:** No caching at API level (fresh data on every request)

---

## Sample SQL: Monthly Executive Report

```sql
SELECT
  report_month,
  revenue_total,
  revenue_mom_pct,
  revenue_yoy_pct,
  paid_revenue_total,
  paid_revenue_mom_pct,
  paid_revenue_yoy_pct,
  paid_spend_total as paid_media_spend,
  paid_spend_mom_pct as paid_media_spend_mom_pct,
  paid_spend_yoy_pct as paid_media_spend_yoy_pct,
  ROUND(SAFE_DIVIDE(paid_revenue_total, paid_spend_total), 2) as attributed_blended_roas,
  ROUND(paid_revenue_mom_pct, 1) as attributed_blended_roas_mom_pct,
  ROUND(paid_revenue_yoy_pct, 1) as attributed_blended_roas_yoy_pct,
  meta_spend,
  meta_spend_mom_pct,
  meta_spend_yoy_pct,
  meta_revenue,
  meta_revenue_mom_pct,
  meta_revenue_yoy_pct,
  meta_roas,
  meta_roas_mom_pct,
  meta_roas_yoy_pct,
  google_spend,
  google_spend_mom_pct,
  google_spend_yoy_pct,
  google_revenue,
  google_revenue_mom_pct,
  google_revenue_yoy_pct,
  google_roas,
  google_roas_mom_pct,
  google_roas_yoy_pct,
  top_emerging_product_title,
  top_emerging_product_revenue,
  top_emerging_product_growth_pct as top_emerging_product_mom_growth_pct,
  top_emerging_product_category
FROM `intelligence-451803.{client}_analytics.monthly_executive_report`
WHERE report_month < DATE_TRUNC(CURRENT_DATE(), MONTH)
ORDER BY report_month DESC
LIMIT 1
```

---

## Sample SQL: Enhanced Country Performance (H&B)

```sql
WITH meta_country_monthly AS (
  SELECT
    CASE
      WHEN country = 'US' THEN 'United States'
      WHEN country = 'CA' THEN 'Canada'
      WHEN country = 'GB' THEN 'United Kingdom'
      ELSE country
    END as country_name,
    CASE
      WHEN country = 'US' THEN 'US'
      WHEN country = 'CA' THEN 'CA'
      WHEN country = 'GB' THEN 'GB'
      ELSE country
    END as country_code,
    FORMAT_DATE('%Y-%m', date_start) as year_month,
    SUM(spend) as meta_spend,
    SUM(
      CAST(
        JSON_EXTRACT_SCALAR(action_value, '$.value') AS FLOAT64
      )
    ) as meta_revenue
  FROM `clients_hb.facebook_ads_insights_country`,
    UNNEST(JSON_EXTRACT_ARRAY(action_values)) as action_value
  WHERE JSON_EXTRACT_SCALAR(action_value, '$.action_type') IN
    ('omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase')
  GROUP BY country_name, country_code, year_month
),
geo_product_agg AS (
  SELECT
    country,
    country_code,
    year_month,
    SUM(total_revenue) as total_revenue,
    SUM(total_units_sold) as total_units_sold,
    AVG(avg_unit_price) as avg_unit_price
  FROM `intelligence-451803.hb_analytics.geographic_product_performance`
  GROUP BY country, country_code, year_month
)
SELECT
  g.country,
  g.country_code,
  g.year_month,
  g.total_revenue,
  g.total_units_sold,
  ROUND(g.avg_unit_price, 2) as avg_unit_price,
  COALESCE(m.meta_revenue, 0) as meta_attributed_revenue,
  COALESCE(m.meta_spend, 0) as meta_spend,
  ROUND(SAFE_DIVIDE(m.meta_revenue, m.meta_spend), 2) as meta_roas
FROM geo_product_agg g
LEFT JOIN meta_country_monthly m
  ON g.country_code = m.country_code
  AND g.year_month = m.year_month
WHERE g.year_month = '2025-10'
  AND g.country_code IN ('US', 'CA', 'GB')
ORDER BY g.total_revenue DESC
```

---

## Quick Reference Table

| Report Type | # Queries | Typical Duration | Primary Use Case |
|-------------|-----------|------------------|------------------|
| `monthly-performance` | 9 queries | 15-25 sec | Base monthly report |
| `hb-monthly-performance` | 11 queries | 25-35 sec | H&B with funnel ads |
| `jumbomax-monthly-performance` | 15 queries | 35-45 sec | Full suite with email |
| `puttout-monthly-performance` | 13 queries | 30-40 sec | Base + email, no funnel ads |
| `weekly-executive` | 3 queries | 5-10 sec | Quick weekly summary |
| `platform-deep-dive` | 2 queries | 5-10 sec | Campaign deep dive |
| `email-retention` | 2 queries | 5-10 sec | Email focus |

---

## Notes

1. **Date Handling:** All dates are handled in local timezone with explicit `T00:00:00` suffix to avoid UTC shifts
2. **ROAS Definition:** Always "Attributed Blended ROAS" = paid media attributed revenue / paid media spend
3. **Fallback Values:** Empty arrays returned on query errors to ensure report continues
4. **Token Efficiency:** Data formatted as compact markdown tables to minimize Claude API token usage
5. **Client-Side Injection:** Funnel ads not sent to Claude (expire quickly), injected client-side instead
