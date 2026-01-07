import { NextResponse } from 'next/server';
import {
  getExecutiveSummaryByDateRange,
  getClientDashboardConfig,
  getPaidMediaTrendByDateRange,
  getShopifyRevenueYoYByDateRange,
  getRevenueForecast7Day,
  getBusinessContextIndex
} from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const clientId = request.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json({ error: 'x-client-id header is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query params are required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    console.log('[Dashboard Custom Range API] Fetching data for:', clientId, startDate, 'to', endDate);

    // Fetch all data in parallel - same pattern as standard dashboard API
    const [data, dashboardConfig, paidMediaTrend, shopifyRevenueYoY, revenueForecast, businessContext] = await Promise.all([
      getExecutiveSummaryByDateRange(clientId, startDate, endDate),
      getClientDashboardConfig(clientId),
      getPaidMediaTrendByDateRange(clientId, startDate, endDate),
      getShopifyRevenueYoYByDateRange(clientId, startDate, endDate),
      getRevenueForecast7Day(clientId),
      getBusinessContextIndex(clientId)
    ]);

    if (!data) {
      return NextResponse.json(
        { error: 'No data available for the selected date range' },
        { status: 404 }
      );
    }

    console.log('[Dashboard Custom Range API] Data from BigQuery:', JSON.stringify(data, null, 2));

    // Determine which clients have Klaviyo integration
    const hasKlaviyo = clientId !== 'hb' && clientId !== 'benhogan';

    // Get targets from config
    const currentMonth = new Date().getMonth();
    const revenueTarget = dashboardConfig?.monthlyRevenueTargets?.[currentMonth] || data.revenue * 1.1;
    const roasTarget = dashboardConfig?.monthlyRoasTarget || 6.5;

    // Build response in EXACT same format as /api/dashboard
    // For custom period, we put the custom values in a 'custom' period slot
    // The frontend getPeriodData handles this appropriately
    return NextResponse.json({
      kpis: {
        totalRevenue: {
          current: data.revenue,
          periodData: {
            custom: {
              value: data.revenue,
              trend: data.revenueYoyGrowthPct || 0
            }
          },
          gaugeValue: data.revenue,
          gaugeMax: revenueTarget,
          gaugeTarget: revenueTarget
        },
        blendedROAS: {
          current: data.blendedRoas || 0,
          periodData: {
            custom: {
              value: data.blendedRoas || 0,
              trend: data.blendedRoasYoyGrowthPct || 0
            }
          },
          gaugeValue: data.blendedRoas || 0,
          gaugeMax: roasTarget,
          gaugeTarget: roasTarget,
          spend: {
            custom: data.blendedSpend
          }
        },
        ...(hasKlaviyo ? {
          emailPerformance: {
            current: data.klaviyoTotalRevenue || 0,
            periodData: {
              custom: {
                value: data.klaviyoTotalRevenue || 0,
                trend: data.klaviyoTotalRevenueYoyGrowthPct || 0
              }
            },
            revenuePerSend: 0,
            openRate: 0,
            clickRate: 0,
            gaugeValue: data.revenue > 0 ? ((data.klaviyoTotalRevenue || 0) / data.revenue) * 100 : 0,
            gaugeMin: 25,
            gaugeMax: 45,
            gaugeTarget: 35
          }
        } : {}),
        paidMediaSpend: {
          current: data.blendedSpend,
          periodData: {
            custom: {
              value: data.blendedSpend,
              trend: data.blendedSpendYoyGrowthPct || 0
            }
          },
          gaugeValue: data.blendedSpend,
          gaugeMax: data.blendedSpend * 1.2,
          gaugeTarget: data.blendedSpend
        },
        googleSpend: {
          current: data.googleSpend || 0,
          periodData: {
            custom: {
              value: data.googleSpend || 0,
              trend: data.googleSpendYoyGrowthPct || 0
            }
          },
          gaugeValue: data.googleSpend || 0,
          gaugeMax: (data.googleSpend || 0) * 1.2,
          gaugeTarget: data.googleSpend || 0
        },
        googleRevenue: {
          current: data.googleRevenue || 0,
          periodData: {
            custom: {
              value: data.googleRevenue || 0,
              trend: data.googleRevenueYoyGrowthPct || 0
            }
          },
          gaugeValue: data.googleRevenue || 0,
          gaugeMax: (data.googleRevenue || 0) * 1.2,
          gaugeTarget: data.googleRevenue || 0
        },
        googleROAS: {
          current: data.googleRoas || 0,
          periodData: {
            custom: {
              value: data.googleRoas || 0,
              trend: data.googleRoasYoyGrowthPct || 0
            }
          },
          gaugeValue: data.googleRoas || 0,
          gaugeMax: 10,
          gaugeTarget: 6.5
        },
        metaSpend: {
          current: data.facebookSpend || 0,
          periodData: {
            custom: {
              value: data.facebookSpend || 0,
              trend: data.facebookSpendYoyGrowthPct || 0
            }
          },
          gaugeValue: data.facebookSpend || 0,
          gaugeMax: (data.facebookSpend || 0) * 1.2,
          gaugeTarget: data.facebookSpend || 0
        },
        metaRevenue: {
          current: data.facebookRevenue || 0,
          periodData: {
            custom: {
              value: data.facebookRevenue || 0,
              trend: data.facebookRevenueYoyGrowthPct || 0
            }
          },
          gaugeValue: data.facebookRevenue || 0,
          gaugeMax: (data.facebookRevenue || 0) * 1.2,
          gaugeTarget: data.facebookRevenue || 0
        },
        metaROAS: {
          current: data.facebookRoas || 0,
          periodData: {
            custom: {
              value: data.facebookRoas || 0,
              trend: data.facebookRoasYoyGrowthPct || 0
            }
          },
          gaugeValue: data.facebookRoas || 0,
          gaugeMax: 10,
          gaugeTarget: 6.5
        },
        productHealth: {
          current: 130500,
          trend: 18.2,
          unitsSold: 8612,
          inventory: 218000,
          status: 'WELL_STOCKED',
          gaugeValue: 8612,
          gaugeMax: 10000,
          gaugeTarget: 8000
        },
        revenueForecast: revenueForecast || {
          totalForecasted: 0,
          lowerBound: 0,
          upperBound: 0,
          suggestedSpend: 0,
          expectedRoas: 0,
          forecastDays: 7
        },
        // Business health and related KPIs - these are snapshots, not date-range specific
        businessHealth: businessContext ? {
          healthIndex: businessContext.businessHealthIndex,
          revenueTrend: businessContext.revenueTrend,
          demandTrend: businessContext.demandTrend,
          gaugeValue: businessContext.businessHealthIndex,
          gaugeMax: 100,
          gaugeTarget: 70
        } : null,
        searchDemand: businessContext ? {
          current: businessContext.searchImpressions7dAvg,
          yoyChange: businessContext.searchDemandYoyChangePct,
          trend: businessContext.demandTrend,
          gaugeValue: businessContext.searchImpressions7dAvg,
          gaugeMax: businessContext.searchImpressions7dAvg * 1.5 || 10000,
          gaugeTarget: businessContext.searchImpressions7dAvg * 1.2 || 8000
        } : null,
        brandAwareness: businessContext ? {
          current: businessContext.brandImpressions30dAvg,
          gaugeValue: businessContext.brandImpressions30dAvg,
          gaugeMax: businessContext.brandImpressions30dAvg * 1.5 || 2000,
          gaugeTarget: businessContext.brandImpressions30dAvg * 1.2 || 1500
        } : null,
        yoyPerformance: businessContext ? {
          status: businessContext.yoyStatus,
          revenueYoyChange: businessContext.revenueYoyChangePct,
          ordersYoyChange: businessContext.ordersYoyChangePct,
          searchYoyChange: businessContext.searchDemandYoyChangePct
        } : null,
        revenueMomentum: businessContext ? {
          revenue7dAvg: businessContext.revenue7dAvg,
          revenue30dAvg: businessContext.revenue30dAvg,
          trend: businessContext.revenueTrend,
          acceleration: ((businessContext.revenue7dAvg - businessContext.revenue30dAvg) / businessContext.revenue30dAvg) * 100
        } : null,
        // Bayesian forecast KPIs are null for custom ranges (they're monthly pacing specific)
        revenuePacing: null,
        roasPacing: null,
        budgetPerformance: null,
        forecastConfidence: null
      },
      dateRange: {
        startDate,
        endDate,
        daysInPeriod: data.daysInPeriod
      },
      charts: {
        revenueTrend: [],
        channelPerformance: [],
        paidMediaTrend: paidMediaTrend || [],
        shopifyRevenueYoY: shopifyRevenueYoY || []
      }
    });
  } catch (error) {
    console.error('Error in dashboard custom range API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
