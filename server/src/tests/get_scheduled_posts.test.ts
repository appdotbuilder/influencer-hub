import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable, platformAccountsTable, scheduledPostsTable } from '../db/schema';
import { getScheduledPostsByUser } from '../handlers/get_scheduled_posts';
import { eq } from 'drizzle-orm';

describe('getScheduledPostsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return scheduled posts for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Test Content',
        content_type: 'post'
      })
      .returning()
      .execute();
    const contentId = contentResult[0].id;

    // Create platform account
    const platformResult = await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'instagram',
        platform_user_id: 'test123',
        username: 'testuser_insta'
      })
      .returning()
      .execute();
    const platformAccountId = platformResult[0].id;

    // Create scheduled posts
    const scheduledAt = new Date('2024-12-01T10:00:00Z');
    await db.insert(scheduledPostsTable)
      .values([
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: scheduledAt,
          status: 'scheduled'
        },
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: new Date('2024-12-02T10:00:00Z'),
          status: 'published',
          published_at: new Date('2024-12-02T10:00:00Z')
        }
      ])
      .execute();

    const result = await getScheduledPostsByUser(userId);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].content_id).toEqual(contentId);
    expect(result[0].platform_account_id).toEqual(platformAccountId);
    expect(result[0].scheduled_at).toEqual(new Date('2024-12-02T10:00:00Z')); // Most recent first due to ordering
    expect(result[0].status).toEqual('published');
    expect(result[1].scheduled_at).toEqual(scheduledAt);
    expect(result[1].status).toEqual('scheduled');
  });

  it('should filter scheduled posts by status', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        username: 'testuser2',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Test Content 2',
        content_type: 'reel'
      })
      .returning()
      .execute();
    const contentId = contentResult[0].id;

    // Create platform account
    const platformResult = await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'tiktok',
        platform_user_id: 'test456',
        username: 'testuser_tiktok'
      })
      .returning()
      .execute();
    const platformAccountId = platformResult[0].id;

    // Create scheduled posts with different statuses
    await db.insert(scheduledPostsTable)
      .values([
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: new Date('2024-12-01T15:00:00Z'),
          status: 'draft'
        },
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: new Date('2024-12-02T15:00:00Z'),
          status: 'scheduled'
        },
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: new Date('2024-12-03T15:00:00Z'),
          status: 'published'
        }
      ])
      .execute();

    // Test filtering by 'scheduled' status
    const scheduledPosts = await getScheduledPostsByUser(userId, 'scheduled');
    expect(scheduledPosts).toHaveLength(1);
    expect(scheduledPosts[0].status).toEqual('scheduled');
    expect(scheduledPosts[0].scheduled_at).toEqual(new Date('2024-12-02T15:00:00Z'));

    // Test filtering by 'draft' status
    const draftPosts = await getScheduledPostsByUser(userId, 'draft');
    expect(draftPosts).toHaveLength(1);
    expect(draftPosts[0].status).toEqual('draft');

    // Test filtering by 'published' status
    const publishedPosts = await getScheduledPostsByUser(userId, 'published');
    expect(publishedPosts).toHaveLength(1);
    expect(publishedPosts[0].status).toEqual('published');
  });

  it('should return empty array for user with no scheduled posts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'empty@example.com',
        username: 'emptyuser',
        full_name: 'Empty User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await getScheduledPostsByUser(userId);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent status', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'filter@example.com',
        username: 'filteruser',
        full_name: 'Filter User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content and platform account
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Filter Test Content',
        content_type: 'video'
      })
      .returning()
      .execute();
    const contentId = contentResult[0].id;

    const platformResult = await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'x',
        platform_user_id: 'filter123',
        username: 'filteruser_x'
      })
      .returning()
      .execute();
    const platformAccountId = platformResult[0].id;

    // Create a scheduled post with 'draft' status
    await db.insert(scheduledPostsTable)
      .values({
        user_id: userId,
        content_id: contentId,
        platform_account_id: platformAccountId,
        scheduled_at: new Date('2024-12-01T12:00:00Z'),
        status: 'draft'
      })
      .execute();

    // Filter by 'published' status (none exist)
    const result = await getScheduledPostsByUser(userId, 'published');
    expect(result).toHaveLength(0);
  });

  it('should order posts by scheduled_at in descending order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'order@example.com',
        username: 'orderuser',
        full_name: 'Order User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content and platform account
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Order Test Content',
        content_type: 'image'
      })
      .returning()
      .execute();
    const contentId = contentResult[0].id;

    const platformResult = await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'facebook',
        platform_user_id: 'order456',
        username: 'orderuser_fb'
      })
      .returning()
      .execute();
    const platformAccountId = platformResult[0].id;

    // Create scheduled posts with different scheduled times
    const dates = [
      new Date('2024-12-01T08:00:00Z'), // Oldest
      new Date('2024-12-03T08:00:00Z'), // Newest
      new Date('2024-12-02T08:00:00Z'), // Middle
    ];

    await db.insert(scheduledPostsTable)
      .values([
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: dates[0],
          status: 'scheduled'
        },
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: dates[1],
          status: 'scheduled'
        },
        {
          user_id: userId,
          content_id: contentId,
          platform_account_id: platformAccountId,
          scheduled_at: dates[2],
          status: 'scheduled'
        }
      ])
      .execute();

    const result = await getScheduledPostsByUser(userId);

    expect(result).toHaveLength(3);
    // Should be ordered by scheduled_at descending (newest first)
    expect(result[0].scheduled_at).toEqual(dates[1]); // 2024-12-03 (newest)
    expect(result[1].scheduled_at).toEqual(dates[2]); // 2024-12-02 (middle)
    expect(result[2].scheduled_at).toEqual(dates[0]); // 2024-12-01 (oldest)
  });

  it('should save scheduled posts to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'save@example.com',
        username: 'saveuser',
        full_name: 'Save User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content and platform account
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Save Test Content',
        content_type: 'story'
      })
      .returning()
      .execute();
    const contentId = contentResult[0].id;

    const platformResult = await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'onlyfans',
        platform_user_id: 'save789',
        username: 'saveuser_of'
      })
      .returning()
      .execute();
    const platformAccountId = platformResult[0].id;

    // Create scheduled post with error message and platform post id
    const scheduledPostResult = await db.insert(scheduledPostsTable)
      .values({
        user_id: userId,
        content_id: contentId,
        platform_account_id: platformAccountId,
        scheduled_at: new Date('2024-12-01T14:00:00Z'),
        status: 'failed',
        error_message: 'API rate limit exceeded',
        platform_post_id: 'platform_123'
      })
      .returning()
      .execute();

    const result = await getScheduledPostsByUser(userId);

    // Verify the result from handler
    expect(result).toHaveLength(1);
    expect(result[0].error_message).toEqual('API rate limit exceeded');
    expect(result[0].platform_post_id).toEqual('platform_123');
    expect(result[0].status).toEqual('failed');

    // Verify data was saved correctly in database
    const dbPosts = await db.select()
      .from(scheduledPostsTable)
      .where(eq(scheduledPostsTable.id, scheduledPostResult[0].id))
      .execute();

    expect(dbPosts).toHaveLength(1);
    expect(dbPosts[0].error_message).toEqual('API rate limit exceeded');
    expect(dbPosts[0].platform_post_id).toEqual('platform_123');
    expect(dbPosts[0].status).toEqual('failed');
    expect(dbPosts[0].created_at).toBeInstanceOf(Date);
    expect(dbPosts[0].updated_at).toBeInstanceOf(Date);
  });
});