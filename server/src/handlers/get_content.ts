import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type Content, type ContentType } from '../schema';
import { eq, and, desc, SQL } from 'drizzle-orm';

export interface GetContentOptions {
  content_type?: ContentType;
  ai_generated?: boolean;
  limit?: number;
  offset?: number;
}

export const getContentByUser = async (userId: number, options: GetContentOptions = {}): Promise<Content[]> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(contentTable.user_id, userId)];

    if (options.content_type !== undefined) {
      conditions.push(eq(contentTable.content_type, options.content_type));
    }

    if (options.ai_generated !== undefined) {
      conditions.push(eq(contentTable.ai_generated, options.ai_generated));
    }

    // Start building the query with conditions
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    // Apply pagination defaults
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    // Execute query with all conditions at once
    const results = await db.select()
      .from(contentTable)
      .where(whereClause)
      .orderBy(desc(contentTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert JSONB fields and return
    return results.map(content => ({
      ...content,
      media_urls: Array.isArray(content.media_urls) ? content.media_urls as string[] : [],
      hashtags: Array.isArray(content.hashtags) ? content.hashtags as string[] : []
    }));
  } catch (error) {
    console.error('Get content by user failed:', error);
    throw error;
  }
};