import { NextResponse } from 'next/server';
import { getForecastScenarios, getForecastDaily, getForecastActuals } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const [scenarios, daily, actuals] = await Promise.all([
      getForecastScenarios(clientId),
      getForecastDaily(clientId),
      getForecastActuals(clientId)
    ]);

    // Find BFCM and Q4 data from scenarios
    const bfcmScenarios = scenarios.find(s => s.period === 'BFCM 2025') || scenarios.find(s => s.period?.includes('BFCM')) || scenarios[0];
    const q4Scenarios = scenarios.find(s => s.period === 'Q4 2025') || scenarios.find(s => s.period?.includes('Q4')) || scenarios[1];

    // Hardcoded BFCM 2025 period: 11/22 - 12/3
    const BFCM_2025_START = '2025-11-22';
    const BFCM_2025_END = '2025-12-03';

    // Create a map of actuals by date string for efficient lookup
    const actualsMap = new Map(
      actuals.map(a => [a.date, a.actual])
    );

    // Merge actuals with daily forecast data
    const dailyWithActuals = daily.map(day => ({
      ...day,
      actual: actualsMap.get(day.date) || null
    }));

    // Calculate actual totals for a date range
    const calculateActualTotal = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let total = 0;
      let count = 0;

      actuals.forEach(a => {
        const date = new Date(a.date);
        if (date >= start && date <= end) {
          total += a.actual;
          count++;
        }
      });

      return {
        total,
        avg: count > 0 ? total / count : 0,
        count
      };
    };

    // Use hardcoded BFCM dates for actuals calculation
    const bfcmActual = calculateActualTotal(BFCM_2025_START, BFCM_2025_END);
    const q4Actual = q4Scenarios ? calculateActualTotal(q4Scenarios.startDate, q4Scenarios.endDate) : null;

    return NextResponse.json({
      scenarios,
      daily: dailyWithActuals,
      bfcm: bfcmScenarios ? { ...bfcmScenarios, actual: bfcmActual } : null,
      q4: q4Scenarios ? { ...q4Scenarios, actual: q4Actual } : null
    });
  } catch (error) {
    console.error('Error in forecasting API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecasting data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
