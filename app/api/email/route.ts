import { NextResponse } from 'next/server';
import { getEmailDashboardData, getEmailCampaignsTable, getEmailFlowsTable } from '@/lib/bigquery';

export async function GET() {
  try {
    const [emailData, campaignsTable, flowsTable] = await Promise.all([
      getEmailDashboardData(),
      getEmailCampaignsTable(),
      getEmailFlowsTable()
    ]);

    if (!emailData) {
      return NextResponse.json(
        { error: 'No email data available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      kpis: {
        totalEmailRevenue: {
          current: emailData.totalEmailRevenue,
          gaugeValue: emailData.totalEmailRevenue,
          gaugeMax: emailData.totalEmailRevenue * 1.2,
          gaugeTarget: emailData.totalEmailRevenue
        },
        campaignRevenue: {
          current: emailData.campaignRevenue,
          gaugeValue: emailData.campaignRevenue,
          gaugeMax: emailData.totalEmailRevenue,
          gaugeTarget: emailData.totalEmailRevenue * 0.6
        },
        flowRevenue: {
          current: emailData.flowRevenue,
          gaugeValue: emailData.flowRevenue,
          gaugeMax: emailData.totalEmailRevenue,
          gaugeTarget: emailData.totalEmailRevenue * 0.4
        }
      },
      metrics: {
        openRate: emailData.avgOpenRate,
        clickRate: emailData.avgClickRate,
        bounceRate: emailData.avgBounceRate,
        unsubscribeRate: emailData.avgUnsubscribeRate,
        totalSends: emailData.totalSends,
        totalBounces: emailData.totalBounces,
        totalUnsubscribes: emailData.totalUnsubscribes
      },
      tables: {
        campaigns: campaignsTable,
        flows: flowsTable
      }
    });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
