import { db } from '../db';
import { scheduledPostsTable, usersTable, contentTable, platformAccountsTable } from '../db/schema';
import { type CreateScheduledPostInput, type ScheduledPost } from '../schema';
import { eq } from 'drizzle-orm';

export const createScheduledPost = async (input: CreateScheduledPostInput): Promise<ScheduledPost> => {
  try {
    // Validate that user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate that content exists and belongs to the user
    const contentExists = await db.select({ id: contentTable.id, user_id: contentTable.user_id })
      .from(contentTable)
      .where(eq(contentTable.id, input.content_id))
      .execute();

    if (contentExists.length === 0) {
      throw new Error(`Content with id ${input.content_id} does not exist`);
    }

    if (contentExists[0].user_id !== input.user_id) {
      throw new Error(`Content with id ${input.content_id} does not belong to user ${input.user_id}`);
    }

    // Validate that platform account exists and belongs to the user
    const platformAccountExists = await db.select({ id: platformAccountsTable.id, user_id: platformAccountsTable.user_id })
      .from(platformAccountsTable)
      .where(eq(platformAccountsTable.id, input.platform_account_id))
      .execute();

    if (platformAccountExists.length === 0) {
      throw new Error(`Platform account with id ${input.platform_account_id} does not exist`);
    }

    if (platformAccountExists[0].user_id !== input.user_id) {
      throw new Error(`Platform account with id ${input.platform_account_id} does not belong to user ${input.user_id}`);
    }

    // Insert the scheduled post record
    const result = await db.insert(scheduledPostsTable)
      .values({
        user_id: input.user_id,
        content_id: input.content_id,
        platform_account_id: input.platform_account_id,
        scheduled_at: input.scheduled_at
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Scheduled post creation failed:', error);
    throw error;
  }
};