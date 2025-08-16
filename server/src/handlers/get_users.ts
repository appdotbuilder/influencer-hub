import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { desc } from 'drizzle-orm';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Fetch all users ordered by creation date (newest first)
    const results = await db.select()
      .from(usersTable)
      .orderBy(desc(usersTable.created_at))
      .execute();

    // Return the results with proper date conversion
    return results.map(user => ({
      ...user,
      // Dates are already properly typed from the database
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};