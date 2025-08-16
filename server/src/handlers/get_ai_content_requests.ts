import { db } from '../db';
import { aiContentRequestsTable } from '../db/schema';
import { type AIContentRequest } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getAIContentRequestsByUser = async (userId: number): Promise<AIContentRequest[]> => {
  try {
    // Query AI content requests for the specified user, ordered by creation date (newest first)
    const results = await db.select()
      .from(aiContentRequestsTable)
      .where(eq(aiContentRequestsTable.user_id, userId))
      .orderBy(desc(aiContentRequestsTable.created_at))
      .execute();

    // Convert database results to schema-compliant format
    return results.map(request => ({
      ...request,
      // No numeric conversions needed - all fields are already in correct types
    }));
  } catch (error) {
    console.error('Failed to fetch AI content requests:', error);
    throw error;
  }
};