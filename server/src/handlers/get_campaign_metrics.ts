import { db } from '../db';
import { campaignMetricsTable } from '../db/schema';
import { type CampaignMetric, type SocialPlatform } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getCampaignMetrics = async (
    campaignId: number, 
    platform?: SocialPlatform, 
    metricName?: string
): Promise<CampaignMetric[]> => {
    try {
        // Build conditions array for filtering
        const conditions: SQL<unknown>[] = [eq(campaignMetricsTable.campaign_id, campaignId)];

        // Add platform filter if provided
        if (platform) {
            conditions.push(eq(campaignMetricsTable.platform, platform));
        }

        // Add metric name filter if provided
        if (metricName) {
            conditions.push(eq(campaignMetricsTable.metric_name, metricName));
        }

        // Build query with all conditions applied
        const results = await db.select()
            .from(campaignMetricsTable)
            .where(and(...conditions))
            .orderBy(desc(campaignMetricsTable.measured_at))
            .execute();

        // Convert numeric fields from strings to numbers
        return results.map(metric => ({
            ...metric,
            metric_value: parseFloat(metric.metric_value)
        }));
    } catch (error) {
        console.error('Failed to get campaign metrics:', error);
        throw error;
    }
};