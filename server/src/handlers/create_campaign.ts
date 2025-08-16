import { db } from '../db';
import { campaignsTable, usersTable } from '../db/schema';
import { type CreateCampaignInput, type Campaign } from '../schema';
import { eq } from 'drizzle-orm';

export const createCampaign = async (input: CreateCampaignInput): Promise<Campaign> => {
  try {
    // Validate user existence
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate date ranges
    if (input.end_date && input.start_date >= input.end_date) {
      throw new Error('Start date must be before end date');
    }

    // Insert campaign record
    const result = await db.insert(campaignsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description || null,
        start_date: input.start_date,
        end_date: input.end_date || null,
        budget: input.budget !== undefined && input.budget !== null ? input.budget.toString() : null, // Convert number to string for numeric column
        target_platforms: input.target_platforms, // JSONB column handles arrays directly
        goals: input.goals || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to proper types before returning
    const campaign = result[0];
    return {
      ...campaign,
      budget: campaign.budget !== null ? parseFloat(campaign.budget) : null, // Convert string back to number
      target_platforms: campaign.target_platforms as typeof input.target_platforms // JSONB column is already an array with proper enum types
    };
  } catch (error) {
    console.error('Campaign creation failed:', error);
    throw error;
  }
};