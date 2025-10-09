import { NextResponse } from 'next/server';
import { initializeCurrentClient, getForecastScenarios, getForecastDaily, getForecastActuals } from '@/lib/bigquery';

export async function GET() {
  try {
    // CRITICAL: Initialize current client cache before BigQuery operations
    await initializeCurrentClient();
    const [scenarios, daily, actuals] = await Promise.all([
      getForecastScenarios(),
      getForecastDaily(),
      getForecastActuals()
    ]);

    // Find BFCM and Q4 data
    const bfcmScenarios = scenarios.find(s => s.period.includes('BFCM'));
    const q4Scenarios = scenarios.find(s => s.period.includes('Q4'));

    // Create a map of actuals by date string for efficient lookup
    const actualsMap = new Map(
      actuals.map(a => [a.date, a.actual])
    );

    // Merge actuals with daily forecast data
    const dailyWithActuals = daily.map(day => ({
      ...day,
      actual: actualsMap.get(day.date) || null
    }));

    return NextResponse.json({
      scenarios,
      daily: dailyWithActuals,
      bfcm: bfcmScenarios,
      q4: q4Scenarios
    });
  } catch (error) {
    console.error('Error in forecasting API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecasting data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
