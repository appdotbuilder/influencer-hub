import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type CreateContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

export const createContent = async (input: CreateContentInput): Promise<Content> => {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert content record
    const result = await db.insert(contentTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description || null,
        content_type: input.content_type,
        ai_generated: input.ai_generated || false,
        script: input.script || null,
        media_urls: input.media_urls || [],
        hashtags: input.hashtags || []
      })
      .returning()
      .execute();

    const content = result[0];
    
    // JSONB fields are already properly typed, no parsing needed
    return {
      ...content,
      media_urls: content.media_urls as string[],
      hashtags: content.hashtags as string[]
    };
  } catch (error) {
    console.error('Content creation failed:', error);
    throw error;
  }
};