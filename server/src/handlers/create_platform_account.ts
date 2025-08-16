import { db } from '../db';
import { platformAccountsTable, usersTable } from '../db/schema';
import { type CreatePlatformAccountInput, type PlatformAccount } from '../schema';
import { eq } from 'drizzle-orm';

export const createPlatformAccount = async (input: CreatePlatformAccountInput): Promise<PlatformAccount> => {
  try {
    // First, validate that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert platform account record
    const result = await db.insert(platformAccountsTable)
      .values({
        user_id: input.user_id,
        platform: input.platform,
        platform_user_id: input.platform_user_id,
        username: input.username,
        access_token: input.access_token || null,
        refresh_token: input.refresh_token || null,
        token_expires_at: input.token_expires_at || null,
        is_active: true, // Default to true
        followers_count: input.followers_count || 0,
        following_count: input.following_count || 0
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Platform account creation failed:', error);
    throw error;
  }
};