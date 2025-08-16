import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable, platformAccountsTable, scheduledPostsTable } from '../db/schema';
import { type CreateScheduledPostInput } from '../schema';
import { createScheduledPost } from '../handlers/create_scheduled_post';
import { eq } from 'drizzle-orm';

describe('createScheduledPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testContentId: number;
  let testPlatformAccountId: number;

  // Helper to create test data
  const createTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/profile.jpg'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: testUserId,
        title: 'Test Content',
        description: 'Test content for scheduling',
        content_type: 'post',
        ai_generated: false,
        script: 'Test script content',
        media_urls: ['https://example.com/image.jpg'],
        hashtags: ['#test', '#content']
      })
      .returning()
      .execute();
    testContentId = contentResult[0].id;

    // Create test platform account
    const platformAccountResult = await db.insert(platformAccountsTable)
      .values({
        user_id: testUserId,
        platform: 'instagram',
        platform_user_id: 'test_platform_user',
        username: 'test_platform_username',
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        is_active: true,
        followers_count: 1000,
        following_count: 500
      })
      .returning()
      .execute();
    testPlatformAccountId = platformAccountResult[0].id;
  };

  const validInput: CreateScheduledPostInput = {
    user_id: 1, // Will be updated in tests
    content_id: 1, // Will be updated in tests
    platform_account_id: 1, // Will be updated in tests
    scheduled_at: new Date('2024-12-31T10:00:00Z')
  };

  it('should create a scheduled post successfully', async () => {
    await createTestData();
    
    const input = {
      ...validInput,
      user_id: testUserId,
      content_id: testContentId,
      platform_account_id: testPlatformAccountId
    };

    const result = await createScheduledPost(input);

    // Verify the returned scheduled post
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.content_id).toEqual(testContentId);
    expect(result.platform_account_id).toEqual(testPlatformAccountId);
    expect(result.scheduled_at).toEqual(input.scheduled_at);
    expect(result.status).toEqual('draft');
    expect(result.platform_post_id).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.published_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save scheduled post to database', async () => {
    await createTestData();
    
    const input = {
      ...validInput,
      user_id: testUserId,
      content_id: testContentId,
      platform_account_id: testPlatformAccountId
    };

    const result = await createScheduledPost(input);

    // Query the database to verify the record was saved
    const savedPosts = await db.select()
      .from(scheduledPostsTable)
      .where(eq(scheduledPostsTable.id, result.id))
      .execute();

    expect(savedPosts).toHaveLength(1);
    expect(savedPosts[0].user_id).toEqual(testUserId);
    expect(savedPosts[0].content_id).toEqual(testContentId);
    expect(savedPosts[0].platform_account_id).toEqual(testPlatformAccountId);
    expect(savedPosts[0].scheduled_at).toEqual(input.scheduled_at);
    expect(savedPosts[0].status).toEqual('draft');
  });

  it('should throw error when user does not exist', async () => {
    await createTestData();
    
    const input = {
      ...validInput,
      user_id: 99999, // Non-existent user
      content_id: testContentId,
      platform_account_id: testPlatformAccountId
    };

    await expect(createScheduledPost(input))
      .rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error when content does not exist', async () => {
    await createTestData();
    
    const input = {
      ...validInput,
      user_id: testUserId,
      content_id: 99999, // Non-existent content
      platform_account_id: testPlatformAccountId
    };

    await expect(createScheduledPost(input))
      .rejects.toThrow(/Content with id 99999 does not exist/i);
  });

  it('should throw error when platform account does not exist', async () => {
    await createTestData();
    
    const input = {
      ...validInput,
      user_id: testUserId,
      content_id: testContentId,
      platform_account_id: 99999 // Non-existent platform account
    };

    await expect(createScheduledPost(input))
      .rejects.toThrow(/Platform account with id 99999 does not exist/i);
  });

  it('should throw error when content does not belong to user', async () => {
    await createTestData();

    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        username: 'anotheruser',
        full_name: 'Another User'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    const input = {
      ...validInput,
      user_id: anotherUserId,
      content_id: testContentId, // Content belongs to testUserId, not anotherUserId
      platform_account_id: testPlatformAccountId
    };

    await expect(createScheduledPost(input))
      .rejects.toThrow(/Content with id .+ does not belong to user/i);
  });

  it('should throw error when platform account does not belong to user', async () => {
    await createTestData();

    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        username: 'anotheruser',
        full_name: 'Another User'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    // Create content for the other user
    const anotherContentResult = await db.insert(contentTable)
      .values({
        user_id: anotherUserId,
        title: 'Another Content',
        content_type: 'post'
      })
      .returning()
      .execute();
    const anotherContentId = anotherContentResult[0].id;

    const input = {
      ...validInput,
      user_id: anotherUserId,
      content_id: anotherContentId,
      platform_account_id: testPlatformAccountId // Platform account belongs to testUserId, not anotherUserId
    };

    await expect(createScheduledPost(input))
      .rejects.toThrow(/Platform account with id .+ does not belong to user/i);
  });

  it('should handle scheduling posts for different platforms', async () => {
    await createTestData();

    // Create additional platform accounts for the same user
    const tiktokAccountResult = await db.insert(platformAccountsTable)
      .values({
        user_id: testUserId,
        platform: 'tiktok',
        platform_user_id: 'tiktok_user',
        username: 'tiktok_username',
        is_active: true,
        followers_count: 2000,
        following_count: 300
      })
      .returning()
      .execute();

    const inputs = [
      {
        user_id: testUserId,
        content_id: testContentId,
        platform_account_id: testPlatformAccountId, // Instagram
        scheduled_at: new Date('2024-12-31T10:00:00Z')
      },
      {
        user_id: testUserId,
        content_id: testContentId,
        platform_account_id: tiktokAccountResult[0].id, // TikTok
        scheduled_at: new Date('2024-12-31T11:00:00Z')
      }
    ];

    const results = await Promise.all(inputs.map(input => createScheduledPost(input)));

    expect(results).toHaveLength(2);
    expect(results[0].platform_account_id).toEqual(testPlatformAccountId);
    expect(results[1].platform_account_id).toEqual(tiktokAccountResult[0].id);
    expect(results[0].scheduled_at).toEqual(inputs[0].scheduled_at);
    expect(results[1].scheduled_at).toEqual(inputs[1].scheduled_at);
  });

  it('should handle scheduling posts at different times', async () => {
    await createTestData();

    const scheduledTimes = [
      new Date('2024-12-31T08:00:00Z'),
      new Date('2024-12-31T12:00:00Z'),
      new Date('2025-01-01T18:00:00Z')
    ];

    const results = await Promise.all(
      scheduledTimes.map(scheduled_at => 
        createScheduledPost({
          user_id: testUserId,
          content_id: testContentId,
          platform_account_id: testPlatformAccountId,
          scheduled_at
        })
      )
    );

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.scheduled_at).toEqual(scheduledTimes[index]);
      expect(result.status).toEqual('draft');
    });
  });
});