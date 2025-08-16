import { db } from '../db';
import { scheduledPostsTable, contentTable, platformAccountsTable } from '../db/schema';
import { type ScheduledPost, type PostStatus } from '../schema';
import { eq, and, desc, SQL } from 'drizzle-orm';

export const getScheduledPostsByUser = async (userId: number, status?: PostStatus): Promise<ScheduledPost[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [
      eq(scheduledPostsTable.user_id, userId)
    ];

    // Add status filter if provided
    if (status !== undefined) {
      conditions.push(eq(scheduledPostsTable.status, status));
    }

    // Build complete query with all conditions applied at once
    const results = await db.select({
      // Select all scheduled post fields
      id: scheduledPostsTable.id,
      user_id: scheduledPostsTable.user_id,
      content_id: scheduledPostsTable.content_id,
      platform_account_id: scheduledPostsTable.platform_account_id,
      scheduled_at: scheduledPostsTable.scheduled_at,
      status: scheduledPostsTable.status,
      platform_post_id: scheduledPostsTable.platform_post_id,
      error_message: scheduledPostsTable.error_message,
      published_at: scheduledPostsTable.published_at,
      created_at: scheduledPostsTable.created_at,
      updated_at: scheduledPostsTable.updated_at,
    })
    .from(scheduledPostsTable)
    .innerJoin(contentTable, eq(scheduledPostsTable.content_id, contentTable.id))
    .innerJoin(platformAccountsTable, eq(scheduledPostsTable.platform_account_id, platformAccountsTable.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(scheduledPostsTable.scheduled_at))
    .execute();

    // Return the scheduled posts (no numeric conversions needed as all fields are already proper types)
    return results;
  } catch (error) {
    console.error('Failed to get scheduled posts:', error);
    throw error;
  }
};