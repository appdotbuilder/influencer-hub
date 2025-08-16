import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, aiContentRequestsTable } from '../db/schema';
import { type CreateUserInput, type CreateAIContentRequestInput } from '../schema';
import { getAIContentRequestsByUser } from '../handlers/get_ai_content_requests';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  bio: 'A test user for AI content requests',
  profile_image_url: 'https://example.com/avatar.jpg'
};

const testAIRequest: CreateAIContentRequestInput = {
  user_id: 1, // Will be set after user creation
  prompt: 'Generate a fun Instagram post about trending fashion styles',
  content_type: 'post',
  platform: 'instagram'
};

describe('getAIContentRequestsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no AI content requests', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const requests = await getAIContentRequestsByUser(userId);

    expect(requests).toEqual([]);
  });

  it('should return AI content requests for specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create AI content request
    await db.insert(aiContentRequestsTable)
      .values({
        user_id: userId,
        prompt: testAIRequest.prompt,
        content_type: testAIRequest.content_type,
        platform: testAIRequest.platform,
        status: 'pending'
      })
      .execute();

    const requests = await getAIContentRequestsByUser(userId);

    expect(requests).toHaveLength(1);
    expect(requests[0].user_id).toEqual(userId);
    expect(requests[0].prompt).toEqual(testAIRequest.prompt);
    expect(requests[0].content_type).toEqual(testAIRequest.content_type);
    expect(requests[0].platform).toEqual(testAIRequest.platform);
    expect(requests[0].status).toEqual('pending');
    expect(requests[0].id).toBeDefined();
    expect(requests[0].created_at).toBeInstanceOf(Date);
    expect(requests[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return requests ordered by creation date (newest first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple AI content requests with slight delay to ensure different timestamps
    await db.insert(aiContentRequestsTable)
      .values({
        user_id: userId,
        prompt: 'First request - oldest',
        content_type: 'post',
        platform: 'instagram',
        status: 'completed'
      })
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(aiContentRequestsTable)
      .values({
        user_id: userId,
        prompt: 'Second request - newest',
        content_type: 'video',
        platform: 'tiktok',
        status: 'pending'
      })
      .execute();

    const requests = await getAIContentRequestsByUser(userId);

    expect(requests).toHaveLength(2);
    // Newest should be first (descending order by created_at)
    expect(requests[0].prompt).toEqual('Second request - newest');
    expect(requests[1].prompt).toEqual('First request - oldest');
    expect(requests[0].created_at >= requests[1].created_at).toBe(true);
  });

  it('should only return requests for specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        bio: 'First user',
        profile_image_url: 'https://example.com/user1.jpg'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        bio: 'Second user',
        profile_image_url: 'https://example.com/user2.jpg'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create AI requests for both users
    await db.insert(aiContentRequestsTable)
      .values([
        {
          user_id: user1Id,
          prompt: 'User 1 request',
          content_type: 'post',
          platform: 'instagram',
          status: 'pending'
        },
        {
          user_id: user2Id,
          prompt: 'User 2 request',
          content_type: 'reel',
          platform: 'instagram',
          status: 'completed'
        }
      ])
      .execute();

    // Get requests for user 1 only
    const user1Requests = await getAIContentRequestsByUser(user1Id);

    expect(user1Requests).toHaveLength(1);
    expect(user1Requests[0].user_id).toEqual(user1Id);
    expect(user1Requests[0].prompt).toEqual('User 1 request');
  });

  it('should handle different request statuses correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create AI requests with different statuses
    await db.insert(aiContentRequestsTable)
      .values([
        {
          user_id: userId,
          prompt: 'Pending request',
          content_type: 'post',
          platform: 'instagram',
          status: 'pending'
        },
        {
          user_id: userId,
          prompt: 'Generating request',
          content_type: 'video',
          platform: 'tiktok',
          status: 'generating'
        },
        {
          user_id: userId,
          prompt: 'Completed request',
          content_type: 'story',
          platform: 'instagram',
          status: 'completed',
          generated_content: 'Here is your generated content!'
        },
        {
          user_id: userId,
          prompt: 'Failed request',
          content_type: 'reel',
          platform: 'instagram',
          status: 'failed',
          error_message: 'AI service unavailable'
        }
      ])
      .execute();

    const requests = await getAIContentRequestsByUser(userId);

    expect(requests).toHaveLength(4);
    
    // Verify all different statuses are present
    const statuses = requests.map(req => req.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('generating');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');

    // Check that completed request has generated content
    const completedRequest = requests.find(req => req.status === 'completed');
    expect(completedRequest?.generated_content).toEqual('Here is your generated content!');

    // Check that failed request has error message
    const failedRequest = requests.find(req => req.status === 'failed');
    expect(failedRequest?.error_message).toEqual('AI service unavailable');
  });

  it('should save and retrieve all AI request data correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Insert AI content request with all fields
    const insertResult = await db.insert(aiContentRequestsTable)
      .values({
        user_id: userId,
        prompt: 'Create engaging content about sustainable living tips',
        content_type: 'video',
        platform: 'tiktok',
        status: 'completed',
        generated_content: 'Check out these 5 amazing eco-friendly tips! 🌱 #sustainability #ecofriendly',
        error_message: null
      })
      .returning()
      .execute();

    const requests = await getAIContentRequestsByUser(userId);

    expect(requests).toHaveLength(1);
    const request = requests[0];

    // Verify database record matches retrieved data
    const dbRecord = await db.select()
      .from(aiContentRequestsTable)
      .where(eq(aiContentRequestsTable.id, request.id))
      .execute();

    expect(dbRecord).toHaveLength(1);
    expect(request.id).toEqual(dbRecord[0].id);
    expect(request.user_id).toEqual(dbRecord[0].user_id);
    expect(request.prompt).toEqual(dbRecord[0].prompt);
    expect(request.content_type).toEqual(dbRecord[0].content_type);
    expect(request.platform).toEqual(dbRecord[0].platform);
    expect(request.status).toEqual(dbRecord[0].status);
    expect(request.generated_content).toEqual(dbRecord[0].generated_content);
    expect(request.error_message).toEqual(dbRecord[0].error_message);
    expect(request.created_at).toBeInstanceOf(Date);
    expect(request.updated_at).toBeInstanceOf(Date);
  });
});