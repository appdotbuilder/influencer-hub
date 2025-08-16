import { db } from '../db';
import { platformAccountsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type PlatformAccount } from '../schema';

export const getPlatformAccountsByUser = async (userId: number): Promise<PlatformAccount[]> => {
  try {
    // First, validate that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Fetch all platform accounts for the user
    const results = await db.select()
      .from(platformAccountsTable)
      .where(eq(platformAccountsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(account => ({
      ...account,
      token_expires_at: account.token_expires_at || null,
      access_token: account.access_token || null,
      refresh_token: account.refresh_token || null
    }));
  } catch (error) {
    console.error('Failed to fetch platform accounts:', error);
    throw error;
  }
};