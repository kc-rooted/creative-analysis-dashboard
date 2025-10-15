import { NextResponse } from 'next/server';
import { getExecutiveSummary, getPaidMediaTrend, getShopifyRevenueYoY, getRevenueForecast7Day, getClientDashboardConfig, getBusinessContextIndex, initializeCurrentClient, getCurrentClientId } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Initialize client cache once per function instance
    await initializeCurrentClient();

    // Get current client ID to determine which features to include
    const currentClientId = await getCurrentClientId();

    // Get period from query params (7d, mtd, or 30d)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Convert period to days for BigQuery functions
    let days = 7;
    if (period === 'mtd') {
      // Calculate days since start of month
      const now = new Date();
      days = now.getDate() - 1; // Days elapsed in current month
    } else if (period === '30d') {
      days = 30;
    }

    const [data, paidMediaTrend, shopifyRevenueYoY, revenueForecast, dashboardConfig, businessContext] = await Promise.all([
      getExecutiveSummary(),
      getPaidMediaTrend(days),
      getShopifyRevenueYoY(days),
      getRevenueForecast7Day(),
      getClientDashboardConfig(),
      getBusinessContextIndex()
    ]);

    if (!data) {
      return NextResponse.json(
        { error: 'No executive summary data available' },
        { status: 404 }
      );
    }

    // Convert NUMERIC types to numbers
    const revenue_mtd = parseFloat((data.revenue_mtd as any) || '0');
    const revenue_7d = parseFloat((data.revenue_7d as any) || '0');
    const revenue_30d = parseFloat((data.revenue_30d as any) || '0');
    const blended_spend_mtd = parseFloat((data.blended_spend_mtd as any) || '0');
    const blended_spend_7d = parseFloat((data.blended_spend_7d as any) || '0');
    const blended_spend_30d = parseFloat((data.blended_spend_30d as any) || '0');

    // Get current month (0-indexed)
    const currentMonth = new Date().getMonth();

    // Get targets from client config
    console.log('[Dashboard API] Dashboard config from DB:', dashboardConfig);
    console.log('[Dashboard API] Current month:', currentMonth);
    console.log('[Dashboard API] Monthly revenue targets:', dashboardConfig?.monthlyRevenueTargets);

    const revenueTarget = dashboardConfig?.monthlyRevenueTargets?.[currentMonth] || revenue_mtd * 1.1;
    const roasTarget = dashboardConfig?.monthlyRoasTarget || 6.5;

    console.log('[Dashboard API] Using revenue target:', revenueTarget);
    console.log('[Dashboard API] Using ROAS target:', roasTarget);

    // Determine which clients have Klaviyo integration
    const hasKlaviyo = currentClientId !== 'hb'; // HB doesn't have Klaviyo
    console.log('[Dashboard API] Client has Klaviyo:', hasKlaviyo, 'for client:', currentClientId);

    return NextResponse.json({
      kpis: {
        totalRevenue: {
          current: revenue_mtd,
          periodData: {
            monthToDate: {
              value: revenue_mtd,
              trend: data.revenue_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: revenue_30d,
              trend: data.revenue_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: revenue_7d,
              trend: data.revenue_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: revenue_mtd,
          gaugeMax: revenueTarget,
          gaugeTarget: revenueTarget
        },
        blendedROAS: {
          current: data.blended_roas_mtd || 0,
          periodData: {
            monthToDate: {
              value: data.blended_roas_mtd || 0,
              trend: data.blended_roas_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: data.blended_roas_30d || 0,
              trend: data.blended_roas_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: data.blended_roas_7d || 0,
              trend: data.blended_roas_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: data.blended_roas_mtd || 0,
          gaugeMax: roasTarget,
          gaugeTarget: roasTarget,
          spend: {
            monthToDate: blended_spend_mtd,
            thirtyDay: blended_spend_30d,
            sevenDay: blended_spend_7d
          }
        },
        ...(hasKlaviyo ? {
          emailPerformance: {
            current: data.klaviyo_total_revenue_mtd || 0,
            periodData: {
              monthToDate: {
                value: data.klaviyo_total_revenue_mtd || 0,
                trend: data.klaviyo_total_revenue_mtd_yoy_growth_pct || 0
              },
              thirtyDay: {
                value: data.klaviyo_total_revenue_30d || 0,
                trend: data.klaviyo_total_revenue_30d_yoy_growth_pct || 0
              },
              sevenDay: {
                value: data.klaviyo_total_revenue_7d || 0,
                trend: data.klaviyo_total_revenue_7d_yoy_growth_pct || 0
              }
            },
            revenuePerSend: data.klaviyo_revenue_per_send_mtd || 0,
            openRate: 0,
            clickRate: 0,
            // Calculate email as % of total revenue
            gaugeValue: ((data.klaviyo_total_revenue_mtd || 0) / revenue_mtd) * 100, // Actual percentage
            gaugeMin: 25, // Low bound at 25%
            gaugeMax: 45, // High bound at 45%
            gaugeTarget: 35 // Target at 35%
          }
        } : {}),
        paidMediaSpend: {
          current: blended_spend_mtd,
          periodData: {
            monthToDate: {
              value: blended_spend_mtd,
              trend: data.blended_spend_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: blended_spend_30d,
              trend: data.blended_spend_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: blended_spend_7d,
              trend: data.blended_spend_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: blended_spend_mtd,
          gaugeMax: blended_spend_mtd * 1.2,
          gaugeTarget: blended_spend_mtd
        },
        googleSpend: {
          current: parseFloat((data.google_spend_mtd as any) || '0'),
          periodData: {
            monthToDate: {
              value: parseFloat((data.google_spend_mtd as any) || '0'),
              trend: data.google_spend_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: parseFloat((data.google_spend_30d as any) || '0'),
              trend: data.google_spend_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: parseFloat((data.google_spend_7d as any) || '0'),
              trend: data.google_spend_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: parseFloat((data.google_spend_mtd as any) || '0'),
          gaugeMax: parseFloat((data.google_spend_mtd as any) || '0') * 1.2,
          gaugeTarget: parseFloat((data.google_spend_mtd as any) || '0')
        },
        googleRevenue: {
          current: parseFloat((data.google_revenue_mtd as any) || '0'),
          periodData: {
            monthToDate: {
              value: parseFloat((data.google_revenue_mtd as any) || '0'),
              trend: data.google_revenue_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: parseFloat((data.google_revenue_30d as any) || '0'),
              trend: data.google_revenue_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: parseFloat((data.google_revenue_7d as any) || '0'),
              trend: data.google_revenue_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: parseFloat((data.google_revenue_mtd as any) || '0'),
          gaugeMax: parseFloat((data.google_revenue_mtd as any) || '0') * 1.2,
          gaugeTarget: parseFloat((data.google_revenue_mtd as any) || '0')
        },
        googleROAS: {
          current: data.google_roas_mtd || 0,
          periodData: {
            monthToDate: {
              value: data.google_roas_mtd || 0,
              trend: data.google_roas_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: data.google_roas_30d || 0,
              trend: data.google_roas_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: data.google_roas_7d || 0,
              trend: data.google_roas_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: data.google_roas_mtd || 0,
          gaugeMax: 10,
          gaugeTarget: 6.5
        },
        metaSpend: {
          current: parseFloat((data.facebook_spend_mtd as any) || '0'),
          periodData: {
            monthToDate: {
              value: parseFloat((data.facebook_spend_mtd as any) || '0'),
              trend: data.facebook_spend_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: parseFloat((data.facebook_spend_30d as any) || '0'),
              trend: data.facebook_spend_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: parseFloat((data.facebook_spend_7d as any) || '0'),
              trend: data.facebook_spend_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: parseFloat((data.facebook_spend_mtd as any) || '0'),
          gaugeMax: parseFloat((data.facebook_spend_mtd as any) || '0') * 1.2,
          gaugeTarget: parseFloat((data.facebook_spend_mtd as any) || '0')
        },
        metaRevenue: {
          current: parseFloat((data.facebook_revenue_mtd as any) || '0'),
          periodData: {
            monthToDate: {
              value: parseFloat((data.facebook_revenue_mtd as any) || '0'),
              trend: data.facebook_revenue_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: parseFloat((data.facebook_revenue_30d as any) || '0'),
              trend: data.facebook_revenue_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: parseFloat((data.facebook_revenue_7d as any) || '0'),
              trend: data.facebook_revenue_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: parseFloat((data.facebook_revenue_mtd as any) || '0'),
          gaugeMax: parseFloat((data.facebook_revenue_mtd as any) || '0') * 1.2,
          gaugeTarget: parseFloat((data.facebook_revenue_mtd as any) || '0')
        },
        metaROAS: {
          current: data.facebook_roas_mtd || 0,
          periodData: {
            monthToDate: {
              value: data.facebook_roas_mtd || 0,
              trend: data.facebook_roas_mtd_yoy_growth_pct || 0
            },
            thirtyDay: {
              value: data.facebook_roas_30d || 0,
              trend: data.facebook_roas_30d_yoy_growth_pct || 0
            },
            sevenDay: {
              value: data.facebook_roas_7d || 0,
              trend: data.facebook_roas_7d_yoy_growth_pct || 0
            }
          },
          gaugeValue: data.facebook_roas_mtd || 0,
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
        } : null
      },
      charts: {
        revenueTrend: [
          { date: '2024-09-01', revenue: 4500, orders: 89, spend: 750, roas: '6.00' },
          { date: '2024-09-02', revenue: 3200, orders: 65, spend: 680, roas: '4.71' },
          { date: '2024-09-03', revenue: 5100, orders: 102, spend: 820, roas: '6.22' }
        ],
        channelPerformance: [
          { name: 'Facebook Ads', value: 35000 },
          { name: 'Google Ads', value: 28000 },
          { name: 'Email', value: 15000 },
          { name: 'Organic', value: 22000 },
          { name: 'Direct', value: 18000 }
        ],
        paidMediaTrend: paidMediaTrend,
        shopifyRevenueYoY: shopifyRevenueYoY
      }
    });
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}