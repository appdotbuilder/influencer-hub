import { db } from '../db';
import { campaignsTable } from '../db/schema';
import { type Campaign, type CampaignStatus } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getCampaignsByUser = async (userId: number, status?: CampaignStatus): Promise<Campaign[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    conditions.push(eq(campaignsTable.user_id, userId));

    if (status) {
      conditions.push(eq(campaignsTable.status, status));
    }

    // Build and execute query in one step
    const results = await db.select()
      .from(campaignsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields and handle JSONB arrays
    return results.map(campaign => ({
      ...campaign,
      budget: campaign.budget ? parseFloat(campaign.budget) : null,
      target_platforms: Array.isArray(campaign.target_platforms) ? campaign.target_platforms : []
    }));
  } catch (error) {
    console.error('Failed to get campaigns by user:', error);
    throw error;
  }
};