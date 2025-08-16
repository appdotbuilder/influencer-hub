import { db } from '../db';
import { campaignMetricsTable } from '../db/schema';
import { type CreateCampaignMetricInput, type CampaignMetric } from '../schema';

export const createCampaignMetric = async (input: CreateCampaignMetricInput): Promise<CampaignMetric> => {
  try {
    // Insert campaign metric record
    const result = await db.insert(campaignMetricsTable)
      .values({
        campaign_id: input.campaign_id,
        platform: input.platform,
        metric_name: input.metric_name,
        metric_value: input.metric_value.toString(), // Convert number to string for numeric column
        measured_at: input.measured_at || new Date()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const metric = result[0];
    return {
      ...metric,
      metric_value: parseFloat(metric.metric_value) // Convert string back to number
    };
  } catch (error) {
    console.error('Campaign metric creation failed:', error);
    throw error;
  }
};