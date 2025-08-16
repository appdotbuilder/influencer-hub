import { db } from '../db';
import { aiContentRequestsTable, usersTable } from '../db/schema';
import { type CreateAIContentRequestInput, type AIContentRequest } from '../schema';
import { eq } from 'drizzle-orm';

export const createAIContentRequest = async (input: CreateAIContentRequestInput): Promise<AIContentRequest> => {
  try {
    // Validate user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert AI content request record
    const result = await db.insert(aiContentRequestsTable)
      .values({
        user_id: input.user_id,
        prompt: input.prompt,
        content_type: input.content_type,
        platform: input.platform,
        generated_content: null,
        status: 'pending',
        error_message: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('AI content request creation failed:', error);
    throw error;
  }
};