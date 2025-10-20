import { NextResponse } from 'next/server';
import { getEmailDashboardData, getEmailCampaignsTable, getEmailFlowsTable, initializeCurrentClient } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    // Get requested client from header (sent from frontend)
    const requestedClient = request.headers.get('x-client-id');

    // Initialize with requested client to ensure correct dataset
    await initializeCurrentClient(requestedClient || undefined);

    // Extract date parameters from URL
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || 'mtd';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const comparisonType = searchParams.get('comparisonType') || 'previous-period';

    const [emailData, campaignsTable, flowsTable] = await Promise.all([
      getEmailDashboardData(preset, startDate, endDate, comparisonType),
      getEmailCampaignsTable(preset, startDate, endDate),
      getEmailFlowsTable(preset, startDate, endDate)
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
          previous: emailData.prevTotalEmailRevenue,
          change: emailData.totalEmailRevenueChange,
          pctOfTotal: emailData.emailPctOfTotal,
          prevPctOfTotal: emailData.prevEmailPctOfTotal,
          pctChange: emailData.emailPctChange,
          gaugeValue: emailData.totalEmailRevenue,
          gaugeMax: emailData.totalEmailRevenue * 1.2,
          gaugeTarget: emailData.totalEmailRevenue
        },
        campaignRevenue: {
          current: emailData.campaignRevenue,
          previous: emailData.prevCampaignRevenue,
          change: emailData.campaignRevenueChange,
          pctOfTotal: emailData.campaignPctOfTotal,
          prevPctOfTotal: emailData.prevCampaignPctOfTotal,
          pctChange: emailData.campaignPctChange,
          gaugeValue: emailData.campaignRevenue,
          gaugeMax: emailData.totalEmailRevenue,
          gaugeTarget: emailData.totalEmailRevenue * 0.6
        },
        flowRevenue: {
          current: emailData.flowRevenue,
          previous: emailData.prevFlowRevenue,
          change: emailData.flowRevenueChange,
          pctOfTotal: emailData.flowPctOfTotal,
          prevPctOfTotal: emailData.prevFlowPctOfTotal,
          pctChange: emailData.flowPctChange,
          gaugeValue: emailData.flowRevenue,
          gaugeMax: emailData.totalEmailRevenue,
          gaugeTarget: emailData.totalEmailRevenue * 0.4
        }
      },
      metrics: {
        openRate: emailData.avgOpenRate,
        prevOpenRate: emailData.prevAvgOpenRate,
        openRateChange: emailData.openRateChange,
        humanOpenRate: emailData.avgHumanOpenRate,
        prevHumanOpenRate: emailData.prevAvgHumanOpenRate,
        humanOpenRateChange: emailData.humanOpenRateChange,
        clickRate: emailData.avgClickRate,
        prevClickRate: emailData.prevAvgClickRate,
        clickRateChange: emailData.clickRateChange,
        bounceRate: emailData.avgBounceRate,
        prevBounceRate: emailData.prevAvgBounceRate,
        bounceRateChange: emailData.bounceRateChange,
        unsubscribeRate: emailData.avgUnsubscribeRate,
        prevUnsubscribeRate: emailData.prevAvgUnsubscribeRate,
        unsubscribeRateChange: emailData.unsubscribeRateChange,
        totalSends: emailData.totalSends,
        prevTotalSends: emailData.prevTotalSends,
        totalDeliveries: emailData.totalDeliveries,
        prevTotalDeliveries: emailData.prevTotalDeliveries,
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
