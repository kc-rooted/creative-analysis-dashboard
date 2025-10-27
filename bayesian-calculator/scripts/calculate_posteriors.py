"""
Bayesian Posterior Calculator for ABO Ad Testing Strategy

Calculates:
1. P(Ad is best among all ads in campaign)
2. P(ROAS > threshold) where threshold = 6.0x for backup, 8.0x for champion
3. Expected loss if wrong

Uses Gamma distribution for ROAS posterior modeling.
"""

import numpy as np
from scipy import stats
from scipy.integrate import quad
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime


class BayesianROASCalculator:
    """
    Bayesian calculator for ROAS using Gamma distribution.

    Model:
    - Revenue ~ Gamma(shape=alpha, rate=beta)
    - ROAS = Revenue / Spend
    - Posterior: Gamma(alpha + observed_revenue, beta + observed_spend)
    """

    def __init__(self, prior_alpha: float = 2.0, prior_beta: float = 0.25):
        """
        Initialize with prior parameters.

        Args:
            prior_alpha: Shape parameter for Gamma prior (default: 2.0)
            prior_beta: Rate parameter for Gamma prior (default: 0.25)

        These priors encode weak prior belief centered around ROAS = alpha/beta = 8.0x
        """
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta

    def fit_posterior(self, revenue: float, spend: float) -> Tuple[float, float]:
        """
        Calculate posterior parameters given observed data.

        Args:
            revenue: Observed revenue
            spend: Observed spend

        Returns:
            (alpha_posterior, beta_posterior) for Gamma distribution
        """
        # Posterior update: add observed data to prior
        alpha_post = self.prior_alpha + revenue
        beta_post = self.prior_beta + spend

        return alpha_post, beta_post

    def prob_roas_above_threshold(
        self,
        alpha_post: float,
        beta_post: float,
        threshold: float
    ) -> float:
        """
        Calculate P(ROAS > threshold).

        ROAS = Revenue / Spend
        Revenue ~ Gamma(alpha, beta)
        We need P(Revenue/Spend > threshold) = P(Revenue > threshold * Spend)

        But since Spend is in the posterior beta parameter, we need to be careful.
        Actually, ROAS ~ scaled Gamma, so we calculate survival function.

        Args:
            alpha_post: Posterior shape parameter
            beta_post: Posterior rate parameter
            threshold: ROAS threshold (e.g., 6.0 or 8.0)

        Returns:
            Probability that ROAS exceeds threshold
        """
        # For Gamma distribution, ROAS = (Revenue / Spend)
        # If Revenue ~ Gamma(alpha, beta) and we've encoded spend in beta,
        # then ROAS ~ Gamma(alpha, beta) / spend_component
        #
        # Actually, let's think of this differently:
        # posterior_mean_roas = alpha_post / beta_post
        # We want P(ROAS > threshold)

        # Create Gamma distribution with posterior parameters
        dist = stats.gamma(a=alpha_post, scale=1/beta_post)

        # Calculate P(X > threshold) = 1 - CDF(threshold)
        prob = 1 - dist.cdf(threshold)

        return prob

    def prob_is_best(
        self,
        alpha_post: float,
        beta_post: float,
        other_posteriors: List[Tuple[float, float]],
        n_samples: int = 10000
    ) -> float:
        """
        Calculate P(this ad is best among all ads in campaign) using Monte Carlo.

        Args:
            alpha_post: This ad's posterior alpha
            beta_post: This ad's posterior beta
            other_posteriors: List of (alpha, beta) tuples for other ads
            n_samples: Number of Monte Carlo samples

        Returns:
            Probability that this ad has highest ROAS
        """
        # Sample from this ad's posterior
        this_samples = np.random.gamma(alpha_post, 1/beta_post, n_samples)

        # Sample from all other ads' posteriors
        other_samples = []
        for alpha, beta in other_posteriors:
            samples = np.random.gamma(alpha, 1/beta, n_samples)
            other_samples.append(samples)

        # Convert to array for vectorized comparison
        other_samples = np.array(other_samples)  # shape: (n_other_ads, n_samples)

        # Count how many times this ad is best
        if len(other_samples) > 0:
            max_others = np.max(other_samples, axis=0)  # max across other ads for each sample
            is_best = this_samples > max_others
            prob = np.mean(is_best)
        else:
            # Only one ad in campaign
            prob = 1.0

        return prob

    def expected_loss(
        self,
        alpha_post: float,
        beta_post: float,
        other_posteriors: List[Tuple[float, float]],
        n_samples: int = 10000
    ) -> float:
        """
        Calculate expected loss if we pick this ad but it's not the best.

        Expected loss = E[max(other_ROAS) - this_ROAS | this is not best]

        Args:
            alpha_post: This ad's posterior alpha
            beta_post: This ad's posterior beta
            other_posteriors: List of (alpha, beta) tuples for other ads
            n_samples: Number of Monte Carlo samples

        Returns:
            Expected loss (in ROAS points)
        """
        # Sample from posteriors
        this_samples = np.random.gamma(alpha_post, 1/beta_post, n_samples)

        other_samples = []
        for alpha, beta in other_posteriors:
            samples = np.random.gamma(alpha, 1/beta, n_samples)
            other_samples.append(samples)

        if len(other_samples) == 0:
            return 0.0

        other_samples = np.array(other_samples)
        max_others = np.max(other_samples, axis=0)

        # Calculate loss for each sample
        loss = np.maximum(0, max_others - this_samples)

        # Expected loss
        expected_loss = np.mean(loss)

        return expected_loss


def calculate_posteriors_for_campaign(
    campaign_data: pd.DataFrame,
    calculator: BayesianROASCalculator,
    backup_threshold: float = 6.0,
    champion_threshold: float = 8.0
) -> pd.DataFrame:
    """
    Calculate Bayesian posteriors for all ad sets in a campaign.

    Args:
        campaign_data: DataFrame with columns [ad_set_id, ad_set_name, revenue, spend, ad_type]
        calculator: BayesianROASCalculator instance
        backup_threshold: ROAS threshold for backup ads (default: 6.0x)
        champion_threshold: ROAS threshold for champion ads (default: 8.0x)

    Returns:
        DataFrame with posterior metrics for each ad set
    """
    results = []

    # Calculate posteriors for each ad set
    posteriors = {}
    for _, row in campaign_data.iterrows():
        ad_set_id = row['ad_set_id']
        revenue = float(row['revenue'])
        spend = float(row['spend'])

        alpha_post, beta_post = calculator.fit_posterior(revenue, spend)
        posteriors[ad_set_id] = (alpha_post, beta_post)

    # Calculate metrics for each ad set
    for _, row in campaign_data.iterrows():
        ad_set_id = row['ad_set_id']
        ad_set_name = row['ad_set_name']
        ad_type = row.get('ad_type', 'unknown')
        revenue = float(row['revenue'])
        spend = float(row['spend'])

        alpha_post, beta_post = posteriors[ad_set_id]

        # Get posteriors of other ads in campaign
        other_posteriors = [
            posteriors[other_id]
            for other_id in posteriors.keys()
            if other_id != ad_set_id
        ]

        # Determine threshold based on ad type
        threshold = champion_threshold if ad_type == 'champion' else backup_threshold

        # Calculate metrics
        prob_best = calculator.prob_is_best(alpha_post, beta_post, other_posteriors)
        prob_above_threshold = calculator.prob_roas_above_threshold(alpha_post, beta_post, threshold)
        exp_loss = calculator.expected_loss(alpha_post, beta_post, other_posteriors)

        # Posterior mean and std
        posterior_mean_roas = alpha_post / beta_post
        posterior_std_roas = np.sqrt(alpha_post) / beta_post

        results.append({
            'ad_set_id': ad_set_id,
            'ad_set_name': ad_set_name,
            'ad_type': ad_type,
            'revenue': revenue,
            'spend': spend,
            'observed_roas': revenue / spend if spend > 0 else 0,
            'prob_is_best': prob_best,
            'prob_above_threshold': prob_above_threshold,
            'threshold_used': threshold,
            'expected_loss': exp_loss,
            'posterior_mean_roas': posterior_mean_roas,
            'posterior_std_roas': posterior_std_roas,
            'posterior_alpha': alpha_post,
            'posterior_beta': beta_post,
            'calculated_at': datetime.utcnow()
        })

    return pd.DataFrame(results)


def process_all_campaigns(portfolio_data: pd.DataFrame) -> pd.DataFrame:
    """
    Process all campaigns in the portfolio dataset.

    Args:
        portfolio_data: DataFrame from abo_portfolio_performance view
            Expected columns: [campaign_id, campaign_name, ad_set_id, ad_set_name,
                             revenue, spend, ad_type, window_start, window_end]

    Returns:
        DataFrame with Bayesian posteriors for all ad sets
    """
    calculator = BayesianROASCalculator()

    all_results = []

    # Group by campaign
    for campaign_id, campaign_df in portfolio_data.groupby('campaign_id'):
        campaign_name = campaign_df['campaign_name'].iloc[0]

        print(f"Processing campaign: {campaign_name} (ID: {campaign_id})")
        print(f"  Ad sets: {len(campaign_df)}")

        # Calculate posteriors for this campaign
        campaign_results = calculate_posteriors_for_campaign(
            campaign_df,
            calculator
        )

        # Add campaign info
        campaign_results['campaign_id'] = campaign_id
        campaign_results['campaign_name'] = campaign_name
        campaign_results['window_start'] = campaign_df['window_start'].iloc[0]
        campaign_results['window_end'] = campaign_df['window_end'].iloc[0]

        all_results.append(campaign_results)

    # Combine all results
    if all_results:
        final_results = pd.concat(all_results, ignore_index=True)
    else:
        final_results = pd.DataFrame()

    return final_results


if __name__ == '__main__':
    # Test with sample data
    print("Testing Bayesian ROAS Calculator...")

    # Create sample campaign data
    sample_data = pd.DataFrame({
        'campaign_id': ['camp_1', 'camp_1', 'camp_1'],
        'campaign_name': ['Test Campaign', 'Test Campaign', 'Test Campaign'],
        'ad_set_id': ['ad_1', 'ad_2', 'ad_3'],
        'ad_set_name': ['Champion Ad', 'Backup Ad 1', 'Backup Ad 2'],
        'revenue': [8000, 3000, 2500],
        'spend': [1000, 500, 400],
        'ad_type': ['champion', 'backup', 'backup'],
        'window_start': ['2025-01-01'] * 3,
        'window_end': ['2025-01-14'] * 3
    })

    print("\nSample data:")
    print(sample_data[['ad_set_name', 'revenue', 'spend']])
    print(f"\nObserved ROAS:")
    print(sample_data[['ad_set_name']].assign(
        roas=sample_data['revenue'] / sample_data['spend']
    ))

    # Calculate posteriors
    results = process_all_campaigns(sample_data)

    print("\nPosterior Results:")
    print(results[[
        'ad_set_name',
        'observed_roas',
        'posterior_mean_roas',
        'prob_is_best',
        'prob_above_threshold',
        'expected_loss'
    ]].round(3))
