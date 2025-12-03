import { NextResponse } from 'next/server';
import { getForecastScenarios, getForecastDaily, getForecastActuals, initializeCurrentClient } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    const [scenarios, daily, actuals] = await Promise.all([
      getForecastScenarios(),
      getForecastDaily(),
      getForecastActuals()
    ]);

    // Find BFCM and Q4 data (or first two scenarios if not found)
    const bfcmScenarios = scenarios.find(s => s.period.includes('BFCM')) || scenarios[0];
    const q4Scenarios = scenarios.find(s => s.period.includes('Q4')) || scenarios[1];

    // Create a map of actuals by date string for efficient lookup
    const actualsMap = new Map(
      actuals.map(a => [a.date, a.actual])
    );

    // Merge actuals with daily forecast data
    const dailyWithActuals = daily.map(day => ({
      ...day,
      actual: actualsMap.get(day.date) || null
    }));

    // Calculate actual totals for BFCM and Q4 periods
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

    const bfcmActual = bfcmScenarios ? calculateActualTotal(bfcmScenarios.startDate, bfcmScenarios.endDate) : null;
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
