# Bayesian Calculator for ABO Ad Testing

Python service that calculates Bayesian posteriors for Meta Ads ABO (Ad Set Budget Optimization) testing strategy.

## Overview

This service reads ad set performance data from BigQuery and calculates:
1. **P(Ad is best)** - Probability that each ad set has the highest ROAS among all ads in its campaign
2. **P(ROAS > threshold)** - Probability that ROAS exceeds threshold (6.0x for backup, 8.0x for champion)
3. **Expected Loss** - Expected opportunity cost if we choose this ad but it's not the best

## Model Details

- Uses **Gamma distribution** for ROAS posterior
- Prior: Gamma(α=2.0, β=0.25) centered around 8.0x ROAS
- Posterior: Gamma(α + revenue, β + spend)
- Monte Carlo sampling for P(best) and expected loss calculations

## Data Flow

```
BigQuery: puttout_analytics.abo_portfolio_performance (14-day windows)
    ↓
Python Calculator (Bayesian inference)
    ↓
BigQuery: puttout_analytics.abo_bayesian_posteriors (results)
```

## Usage

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Test calculation logic
python scripts/calculate_posteriors.py

# Run full pipeline (requires BigQuery credentials)
export GOOGLE_APPLICATION_CREDENTIALS=../service-account.json
export GOOGLE_CLOUD_PROJECT_ID=intelligence-451803
python scripts/run_nightly.py
```

### Docker

```bash
# Build image
docker-compose build bayesian-calculator

# Run one-time calculation
docker-compose run --rm bayesian-calculator

# Run with profiles (if using profiles in docker-compose)
docker-compose --profile tools run --rm bayesian-calculator
```

### Scheduled Nightly Run

Add to crontab (runs at 2am daily):

```bash
0 2 * * * cd /path/to/project && docker-compose run --rm bayesian-calculator >> /var/log/bayesian-calculator.log 2>&1
```

## Configuration

Environment variables:
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project ID (default: intelligence-451803)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON

## Output Schema

Results written to `puttout_analytics.abo_bayesian_posteriors`:

| Column | Type | Description |
|--------|------|-------------|
| campaign_id | STRING | Campaign identifier |
| campaign_name | STRING | Campaign name |
| ad_set_id | STRING | Ad set identifier |
| ad_set_name | STRING | Ad set name |
| ad_type | STRING | 'champion' or 'backup' |
| revenue | FLOAT | Observed revenue (14-day window) |
| spend | FLOAT | Observed spend (14-day window) |
| observed_roas | FLOAT | Observed ROAS = revenue / spend |
| prob_is_best | FLOAT | P(this ad has highest ROAS) |
| prob_above_threshold | FLOAT | P(ROAS > threshold) |
| threshold_used | FLOAT | Threshold value (6.0 or 8.0) |
| expected_loss | FLOAT | Expected loss if wrong choice |
| posterior_mean_roas | FLOAT | Posterior mean ROAS estimate |
| posterior_std_roas | FLOAT | Posterior std dev |
| posterior_alpha | FLOAT | Gamma posterior α parameter |
| posterior_beta | FLOAT | Gamma posterior β parameter |
| window_start | DATE | Start of 14-day window |
| window_end | DATE | End of 14-day window |
| calculated_at | TIMESTAMP | When calculation ran |

## Phase 1 Status

✅ Calculation logic implemented
✅ BigQuery read/write implemented
✅ Docker configuration complete
✅ Schema defined

## Next Steps (Phase 2)

- [ ] Create `abo_portfolio_performance` view in BigQuery
- [ ] Set up cron job for nightly runs
- [ ] Add monitoring/alerting for failed runs
- [ ] Frontend dashboard to visualize results
