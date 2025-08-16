import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable } from '../db/schema';
import { type CreateUserInput, type CreateContentInput } from '../schema';
import { getContentByUser } from '../handlers/get_content';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User'
};

const testContent1: CreateContentInput = {
  user_id: 1, // Will be set after user creation
  title: 'Test Video Content',
  description: 'A test video for testing',
  content_type: 'video',
  ai_generated: false,
  script: 'This is a test script',
  media_urls: ['https://example.com/video1.mp4'],
  hashtags: ['#test', '#video']
};

const testContent2: CreateContentInput = {
  user_id: 1,
  title: 'AI Generated Post',
  description: 'AI generated content',
  content_type: 'post',
  ai_generated: true,
  media_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  hashtags: ['#ai', '#generated']
};

const testContent3: CreateContentInput = {
  user_id: 1,
  title: 'Instagram Reel',
  content_type: 'reel',
  ai_generated: false,
  media_urls: [],
  hashtags: ['#reel', '#instagram']
};

describe('getContentByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all content for a user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content one by one to ensure different timestamps
    await db.insert(contentTable)
      .values({ ...testContent1, user_id: userId })
      .execute();
    
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
    
    await db.insert(contentTable)
      .values({ ...testContent2, user_id: userId })
      .execute();
    
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
    
    await db.insert(contentTable)
      .values({ ...testContent3, user_id: userId })
      .execute();

    const results = await getContentByUser(userId);

    expect(results).toHaveLength(3);
    expect(results[0].user_id).toEqual(userId);
    expect(results[0].title).toEqual('Instagram Reel'); // Most recent first due to ordering
    expect(results[0].content_type).toEqual('reel');
    expect(results[0].media_urls).toEqual([]);
    expect(results[0].hashtags).toEqual(['#reel', '#instagram']);
    expect(results[0].created_at).toBeInstanceOf(Date);
    
    // Verify ordering - most recent should be first
    expect(results[0].created_at.getTime()).toBeGreaterThan(results[1].created_at.getTime());
    expect(results[1].created_at.getTime()).toBeGreaterThan(results[2].created_at.getTime());
  });

  it('should filter by content_type', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content
    await db.insert(contentTable)
      .values([
        { ...testContent1, user_id: userId },
        { ...testContent2, user_id: userId },
        { ...testContent3, user_id: userId }
      ])
      .execute();

    const results = await getContentByUser(userId, { content_type: 'video' });

    expect(results).toHaveLength(1);
    expect(results[0].content_type).toEqual('video');
    expect(results[0].title).toEqual('Test Video Content');
    expect(results[0].script).toEqual('This is a test script');
    expect(results[0].media_urls).toEqual(['https://example.com/video1.mp4']);
    expect(results[0].hashtags).toEqual(['#test', '#video']);
  });

  it('should filter by ai_generated status', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content
    await db.insert(contentTable)
      .values([
        { ...testContent1, user_id: userId },
        { ...testContent2, user_id: userId },
        { ...testContent3, user_id: userId }
      ])
      .execute();

    const results = await getContentByUser(userId, { ai_generated: true });

    expect(results).toHaveLength(1);
    expect(results[0].ai_generated).toBe(true);
    expect(results[0].title).toEqual('AI Generated Post');
    expect(results[0].content_type).toEqual('post');
  });

  it('should apply pagination with limit and offset', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create 5 content items with staggered timestamps
    for (let i = 0; i < 5; i++) {
      await db.insert(contentTable)
        .values({
          user_id: userId,
          title: `Content ${i + 1}`,
          content_type: 'post',
          ai_generated: false,
          media_urls: [],
          hashtags: []
        })
        .execute();
      
      if (i < 4) await new Promise(resolve => setTimeout(resolve, 2)); // Small delay between inserts
    }

    // Test pagination
    const page1 = await getContentByUser(userId, { limit: 2, offset: 0 });
    const page2 = await getContentByUser(userId, { limit: 2, offset: 2 });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].title).toEqual('Content 5'); // Most recent first
    expect(page1[1].title).toEqual('Content 4');
    expect(page2[0].title).toEqual('Content 3');
    expect(page2[1].title).toEqual('Content 2');
  });

  it('should combine filters', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mixed content
    await db.insert(contentTable)
      .values([
        { ...testContent1, user_id: userId }, // video, ai_generated: false
        { ...testContent2, user_id: userId }, // post, ai_generated: true
        { user_id: userId, title: 'Manual Post', content_type: 'post', ai_generated: false, media_urls: [], hashtags: [] }
      ])
      .execute();

    const results = await getContentByUser(userId, { 
      content_type: 'post', 
      ai_generated: false 
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Manual Post');
    expect(results[0].content_type).toEqual('post');
    expect(results[0].ai_generated).toBe(false);
  });

  it('should return empty array for user with no content', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const results = await getContentByUser(userId);

    expect(results).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999;

    await expect(getContentByUser(nonExistentUserId)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle null/undefined optional fields correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create content with minimal fields
    await db.insert(contentTable)
      .values({
        user_id: userId,
        title: 'Minimal Content',
        content_type: 'post',
        ai_generated: false,
        media_urls: [],
        hashtags: []
      })
      .execute();

    const results = await getContentByUser(userId);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Minimal Content');
    expect(results[0].description).toBeNull();
    expect(results[0].script).toBeNull();
    expect(results[0].media_urls).toEqual([]);
    expect(results[0].hashtags).toEqual([]);
  });

  it('should use default pagination values', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create 25 content items with staggered timestamps
    for (let i = 0; i < 25; i++) {
      await db.insert(contentTable)
        .values({
          user_id: userId,
          title: `Content ${i + 1}`,
          content_type: 'post',
          ai_generated: false,
          media_urls: [],
          hashtags: []
        })
        .execute();
      
      // Small delay to ensure different timestamps
      if (i < 24) await new Promise(resolve => setTimeout(resolve, 1));
    }

    const results = await getContentByUser(userId);

    // Should return default limit of 20
    expect(results).toHaveLength(20);
    expect(results[0].title).toEqual('Content 25'); // Most recent first
  });

  it('should only return content for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'user1@example.com', username: 'user1' })
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'user2@example.com', username: 'user2' })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create content for both users
    await db.insert(contentTable)
      .values([
        { ...testContent1, user_id: user1Id, title: 'User 1 Content' },
        { ...testContent2, user_id: user2Id, title: 'User 2 Content' }
      ])
      .execute();

    const user1Content = await getContentByUser(user1Id);
    const user2Content = await getContentByUser(user2Id);

    expect(user1Content).toHaveLength(1);
    expect(user1Content[0].title).toEqual('User 1 Content');
    expect(user1Content[0].user_id).toEqual(user1Id);

    expect(user2Content).toHaveLength(1);
    expect(user2Content[0].title).toEqual('User 2 Content');
    expect(user2Content[0].user_id).toEqual(user2Id);
  });
});