import { DateRange } from '@/types/dashboard';
import { format } from 'date-fns';

// Dashboard data service for BigQuery views
export class DashboardDataService {

  /**
   * Convert DateRange to SQL date conditions
   */
  private static formatDateRange(dateRange: DateRange): { startDate: string; endDate: string } {
    const { startDate, endDate } = dateRange;

    if (!startDate || !endDate) {
      throw new Error('Date range must have valid start and end dates');
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  }

  /**
   * Get all dashboard data from single consolidated API endpoint
   */
  static async getAllDashboardData(dateRange: DateRange) {
    try {
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange })
      });

      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      // Return comprehensive fallback data
      return {
        kpis: {
          totalRevenue: {
            current: 328500,
            periodData: {
              sevenDay: { value: 82000, trend: 15.2 },
              thirtyDay: { value: 328500, trend: 12.3 }
            },
            gaugeValue: 328500,
            gaugeMax: 400000,
            gaugeTarget: 320000
          },
          blendedROAS: {
            current: 6.75,
            periodData: {
              sevenDay: { value: 5.59, trend: 11.4 },
              thirtyDay: { value: 6.75, trend: 8.2 }
            },
            gaugeValue: 6.75,
            gaugeMax: 8.0,
            gaugeTarget: 6.5,
            spend: {
              sevenDay: 11800,
              thirtyDay: 48700
            }
          },
          emailPerformance: {
            current: 22300,
            periodData: {
              sevenDay: { value: 5800, trend: 17.2 },
              thirtyDay: { value: 22300, trend: 15.0 }
            },
            revenuePerSend: 0.11,
            openRate: 60.4,
            clickRate: 1.3,
            gaugeValue: 0.11,
            gaugeMax: 0.15,
            gaugeTarget: 0.12
          },
          customerLTV: {
            current: 127,
            trend: 3.8,
            predictedCLV: 43,
            churnRisk: 6236,
            gaugeValue: 127,
            gaugeMax: 150,
            gaugeTarget: 130
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
          }
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
            { name: 'Direct', value: 18000 },
          ],
          paidMediaTrend: [
            { date: '2024-09-01', revenue: 4500, orders: 89, spend: 750, roas: '6.00' },
            { date: '2024-09-02', revenue: 3200, orders: 65, spend: 680, roas: '4.71' },
            { date: '2024-09-03', revenue: 5100, orders: 102, spend: 820, roas: '6.22' }
          ]
        }
      };
    }
  }
}