"""
Nightly job to calculate Bayesian posteriors and write to BigQuery.

Reads from: puttout_analytics.abo_portfolio_performance
Writes to: puttout_analytics.abo_bayesian_posteriors
"""

import os
import sys
from google.cloud import bigquery
from google.oauth2 import service_account
import pandas as pd
from datetime import datetime
from calculate_posteriors import process_all_campaigns


# BigQuery configuration
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT_ID', 'intelligence-451803')
DATASET_ID = 'puttout_analytics'
SOURCE_TABLE = 'abo_portfolio_performance'
DEST_TABLE = 'abo_bayesian_posteriors'


def get_bigquery_client():
    """Initialize BigQuery client with service account credentials."""
    credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

    if not credentials_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")

    if not os.path.exists(credentials_path):
        raise FileNotFoundError(f"Credentials file not found: {credentials_path}")

    credentials = service_account.Credentials.from_service_account_file(
        credentials_path,
        scopes=["https://www.googleapis.com/auth/bigquery"]
    )

    client = bigquery.Client(
        project=PROJECT_ID,
        credentials=credentials
    )

    return client


def fetch_portfolio_data(client: bigquery.Client) -> pd.DataFrame:
    """
    Fetch latest 14-day window data from abo_portfolio_performance view.

    Args:
        client: BigQuery client

    Returns:
        DataFrame with portfolio performance data
    """
    query = f"""
    SELECT
        campaign_id,
        campaign_name,
        ad_set_id,
        ad_set_name,
        revenue,
        spend,
        ad_type,
        window_start,
        window_end
    FROM `{PROJECT_ID}.{DATASET_ID}.{SOURCE_TABLE}`
    WHERE window_end = (
        SELECT MAX(window_end)
        FROM `{PROJECT_ID}.{DATASET_ID}.{SOURCE_TABLE}`
    )
    AND spend > 0  -- Only include ad sets with spend
    ORDER BY campaign_id, ad_set_id
    """

    print(f"Fetching data from {DATASET_ID}.{SOURCE_TABLE}...")
    df = client.query(query).to_dataframe()
    print(f"Fetched {len(df)} ad sets from {df['campaign_id'].nunique()} campaigns")

    return df


def write_posteriors_to_bigquery(
    client: bigquery.Client,
    results_df: pd.DataFrame
) -> None:
    """
    Write Bayesian posterior results to BigQuery.

    Args:
        client: BigQuery client
        results_df: DataFrame with posterior calculations
    """
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{DEST_TABLE}"

    # Define schema
    schema = [
        bigquery.SchemaField("campaign_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("campaign_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ad_set_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ad_set_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ad_type", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("revenue", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("spend", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("observed_roas", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("prob_is_best", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("prob_above_threshold", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("threshold_used", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("expected_loss", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("posterior_mean_roas", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("posterior_std_roas", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("posterior_alpha", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("posterior_beta", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("window_start", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("window_end", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("calculated_at", "TIMESTAMP", mode="REQUIRED"),
    ]

    # Create table if it doesn't exist
    try:
        client.get_table(table_id)
        print(f"Table {table_id} already exists")
    except Exception:
        print(f"Creating table {table_id}...")
        table = bigquery.Table(table_id, schema=schema)
        table = client.create_table(table)
        print(f"Created table {table.project}.{table.dataset_id}.{table.table_id}")

    # Convert dates to proper format
    results_df['window_start'] = pd.to_datetime(results_df['window_start']).dt.date
    results_df['window_end'] = pd.to_datetime(results_df['window_end']).dt.date

    # Write to BigQuery (append mode)
    print(f"Writing {len(results_df)} rows to {table_id}...")

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    )

    job = client.load_table_from_dataframe(
        results_df, table_id, job_config=job_config
    )

    job.result()  # Wait for job to complete

    print(f"✅ Successfully wrote {len(results_df)} rows to {table_id}")


def cleanup_old_records(client: bigquery.Client, days_to_keep: int = 90) -> None:
    """
    Delete old records to prevent table from growing indefinitely.

    Args:
        client: BigQuery client
        days_to_keep: Number of days of history to keep (default: 90)
    """
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{DEST_TABLE}"

    query = f"""
    DELETE FROM `{table_id}`
    WHERE calculated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days_to_keep} DAY)
    """

    print(f"Cleaning up records older than {days_to_keep} days...")
    job = client.query(query)
    job.result()
    print(f"✅ Cleanup complete")


def main():
    """Main entry point for nightly job."""
    print("=" * 60)
    print(f"ABO Bayesian Posteriors Calculator")
    print(f"Started at: {datetime.utcnow()} UTC")
    print("=" * 60)

    try:
        # Initialize BigQuery client
        client = get_bigquery_client()
        print("✅ Connected to BigQuery")

        # Fetch portfolio data
        portfolio_df = fetch_portfolio_data(client)

        if portfolio_df.empty:
            print("⚠️  No data found in abo_portfolio_performance view")
            print("Exiting without calculations")
            return

        # Calculate Bayesian posteriors
        print("\nCalculating Bayesian posteriors...")
        results_df = process_all_campaigns(portfolio_df)

        if results_df.empty:
            print("⚠️  No results generated")
            return

        # Write results to BigQuery
        print("\nWriting results to BigQuery...")
        write_posteriors_to_bigquery(client, results_df)

        # Cleanup old records
        cleanup_old_records(client, days_to_keep=90)

        print("\n" + "=" * 60)
        print(f"✅ Job completed successfully!")
        print(f"Processed {len(results_df)} ad sets across {results_df['campaign_id'].nunique()} campaigns")
        print(f"Finished at: {datetime.utcnow()} UTC")
        print("=" * 60)

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ Error occurred: {str(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
