import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, aiContentRequestsTable } from '../db/schema';
import { type CreateAIContentRequestInput } from '../schema';
import { createAIContentRequest } from '../handlers/create_ai_content_request';
import { eq } from 'drizzle-orm';

// Create test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'testuser@example.com',
      username: 'testuser',
      full_name: 'Test User',
      bio: 'Test bio',
      profile_image_url: 'https://example.com/avatar.jpg'
    })
    .returning()
    .execute();
  return result[0];
};

// Test input with all required fields
const testInput: CreateAIContentRequestInput = {
  user_id: 1, // Will be updated with actual user ID
  prompt: 'Create an engaging Instagram post about sustainable fashion trends',
  content_type: 'post',
  platform: 'instagram'
};

describe('createAIContentRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an AI content request', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createAIContentRequest(input);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.prompt).toEqual('Create an engaging Instagram post about sustainable fashion trends');
    expect(result.content_type).toEqual('post');
    expect(result.platform).toEqual('instagram');
    expect(result.status).toEqual('pending');
    expect(result.generated_content).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save AI content request to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createAIContentRequest(input);

    // Query database to verify save
    const requests = await db.select()
      .from(aiContentRequestsTable)
      .where(eq(aiContentRequestsTable.id, result.id))
      .execute();

    expect(requests).toHaveLength(1);
    expect(requests[0].user_id).toEqual(user.id);
    expect(requests[0].prompt).toEqual(input.prompt);
    expect(requests[0].content_type).toEqual('post');
    expect(requests[0].platform).toEqual('instagram');
    expect(requests[0].status).toEqual('pending');
    expect(requests[0].generated_content).toBeNull();
    expect(requests[0].error_message).toBeNull();
    expect(requests[0].created_at).toBeInstanceOf(Date);
    expect(requests[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different content types and platforms', async () => {
    const user = await createTestUser();
    
    // Test video content for TikTok
    const videoInput: CreateAIContentRequestInput = {
      user_id: user.id,
      prompt: 'Generate a viral TikTok dance video script with trending music suggestions',
      content_type: 'video',
      platform: 'tiktok'
    };

    const videoResult = await createAIContentRequest(videoInput);
    expect(videoResult.content_type).toEqual('video');
    expect(videoResult.platform).toEqual('tiktok');
    expect(videoResult.prompt).toEqual(videoInput.prompt);

    // Test story content for Instagram
    const storyInput: CreateAIContentRequestInput = {
      user_id: user.id,
      prompt: 'Create interactive Instagram story content for a product launch',
      content_type: 'story',
      platform: 'instagram'
    };

    const storyResult = await createAIContentRequest(storyInput);
    expect(storyResult.content_type).toEqual('story');
    expect(storyResult.platform).toEqual('instagram');
    expect(storyResult.prompt).toEqual(storyInput.prompt);
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput = { ...testInput, user_id: 99999 };

    await expect(createAIContentRequest(invalidInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle long prompts correctly', async () => {
    const user = await createTestUser();
    const longPrompt = 'Create a comprehensive social media content strategy for a new eco-friendly fashion brand targeting Gen Z consumers. Include specific hashtag recommendations, optimal posting times, engagement strategies, and content themes that resonate with sustainability-conscious young adults. The content should be authentic, visually appealing, and drive both awareness and conversions.';
    
    const longPromptInput: CreateAIContentRequestInput = {
      user_id: user.id,
      prompt: longPrompt,
      content_type: 'post',
      platform: 'instagram'
    };

    const result = await createAIContentRequest(longPromptInput);
    expect(result.prompt).toEqual(longPrompt);
    expect(result.prompt.length).toBeGreaterThan(100);
  });

  it('should handle OnlyFans platform requests', async () => {
    const user = await createTestUser();
    
    const onlyFansInput: CreateAIContentRequestInput = {
      user_id: user.id,
      prompt: 'Generate engaging promotional content for subscriber retention',
      content_type: 'image',
      platform: 'onlyfans'
    };

    const result = await createAIContentRequest(onlyFansInput);
    expect(result.platform).toEqual('onlyfans');
    expect(result.content_type).toEqual('image');
    expect(result.status).toEqual('pending');
  });

  it('should create multiple requests for the same user', async () => {
    const user = await createTestUser();
    
    const request1 = await createAIContentRequest({
      ...testInput,
      user_id: user.id,
      prompt: 'First AI content request'
    });

    const request2 = await createAIContentRequest({
      ...testInput,
      user_id: user.id,
      prompt: 'Second AI content request',
      content_type: 'reel'
    });

    expect(request1.id).not.toEqual(request2.id);
    expect(request1.user_id).toEqual(request2.user_id);
    expect(request1.prompt).not.toEqual(request2.prompt);
    expect(request2.content_type).toEqual('reel');

    // Verify both exist in database
    const allRequests = await db.select()
      .from(aiContentRequestsTable)
      .where(eq(aiContentRequestsTable.user_id, user.id))
      .execute();

    expect(allRequests).toHaveLength(2);
  });
});