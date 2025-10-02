import { NextResponse } from 'next/server';
import { getForecastScenarios, getForecastDaily } from '@/lib/bigquery';

export async function GET() {
  try {
    const [scenarios, daily] = await Promise.all([
      getForecastScenarios(),
      getForecastDaily()
    ]);

    // Find BFCM and Q4 data
    const bfcmScenarios = scenarios.find(s => s.period.includes('BFCM'));
    const q4Scenarios = scenarios.find(s => s.period.includes('Q4'));

    return NextResponse.json({
      scenarios,
      daily,
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
