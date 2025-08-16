import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type CreateContentInput } from '../schema';
import { createContent } from '../handlers/create_content';
import { eq } from 'drizzle-orm';

// Test user for foreign key requirements
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User'
};

// Test input with all fields specified
const fullTestInput: CreateContentInput = {
  user_id: 1,
  title: 'Test Content',
  description: 'A test content piece',
  content_type: 'post',
  ai_generated: true,
  script: 'This is a test script',
  media_urls: ['https://example.com/image1.jpg', 'https://example.com/video1.mp4'],
  hashtags: ['#test', '#content', '#socialmedia']
};

// Minimal test input with only required fields
const minimalTestInput: CreateContentInput = {
  user_id: 1,
  title: 'Minimal Content',
  content_type: 'image'
};

describe('createContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create content with all fields', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createContent(fullTestInput);

    // Verify all fields are correctly set
    expect(result.user_id).toEqual(1);
    expect(result.title).toEqual('Test Content');
    expect(result.description).toEqual('A test content piece');
    expect(result.content_type).toEqual('post');
    expect(result.ai_generated).toEqual(true);
    expect(result.script).toEqual('This is a test script');
    expect(result.media_urls).toEqual(['https://example.com/image1.jpg', 'https://example.com/video1.mp4']);
    expect(result.hashtags).toEqual(['#test', '#content', '#socialmedia']);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create content with minimal required fields', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createContent(minimalTestInput);

    // Verify required fields
    expect(result.user_id).toEqual(1);
    expect(result.title).toEqual('Minimal Content');
    expect(result.content_type).toEqual('image');

    // Verify optional fields have proper defaults
    expect(result.description).toBeNull();
    expect(result.ai_generated).toEqual(false);
    expect(result.script).toBeNull();
    expect(result.media_urls).toEqual([]);
    expect(result.hashtags).toEqual([]);
  });

  it('should save content to database correctly', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createContent(fullTestInput);

    // Query database to verify content was saved
    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, result.id))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].user_id).toEqual(1);
    expect(savedContent[0].title).toEqual('Test Content');
    expect(savedContent[0].description).toEqual('A test content piece');
    expect(savedContent[0].content_type).toEqual('post');
    expect(savedContent[0].ai_generated).toEqual(true);
    expect(savedContent[0].script).toEqual('This is a test script');
    
    // Verify JSONB fields are stored correctly
    expect(savedContent[0].media_urls).toEqual(['https://example.com/image1.jpg', 'https://example.com/video1.mp4']);
    expect(savedContent[0].hashtags).toEqual(['#test', '#content', '#socialmedia']);
  });

  it('should handle different content types', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const contentTypes: Array<'post' | 'story' | 'reel' | 'video' | 'image'> = ['post', 'story', 'reel', 'video', 'image'];

    for (const contentType of contentTypes) {
      const input: CreateContentInput = {
        user_id: 1,
        title: `Test ${contentType}`,
        content_type: contentType
      };

      const result = await createContent(input);
      expect(result.content_type).toEqual(contentType);
      expect(result.title).toEqual(`Test ${contentType}`);
    }
  });

  it('should handle empty arrays for media_urls and hashtags', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: CreateContentInput = {
      user_id: 1,
      title: 'Test Empty Arrays',
      content_type: 'post',
      media_urls: [],
      hashtags: []
    };

    const result = await createContent(input);

    expect(result.media_urls).toEqual([]);
    expect(result.hashtags).toEqual([]);
  });

  it('should throw error when user does not exist', async () => {
    // Don't create user - test foreign key validation

    const input: CreateContentInput = {
      user_id: 999, // Non-existent user
      title: 'Test Content',
      content_type: 'post'
    };

    await expect(createContent(input)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should handle ai_generated flag correctly', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    // Test ai_generated = true
    const aiInput: CreateContentInput = {
      user_id: 1,
      title: 'AI Generated Content',
      content_type: 'post',
      ai_generated: true
    };

    const aiResult = await createContent(aiInput);
    expect(aiResult.ai_generated).toEqual(true);

    // Test ai_generated = false (explicit)
    const manualInput: CreateContentInput = {
      user_id: 1,
      title: 'Manual Content',
      content_type: 'post',
      ai_generated: false
    };

    const manualResult = await createContent(manualInput);
    expect(manualResult.ai_generated).toEqual(false);
  });

  it('should handle script field correctly', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: CreateContentInput = {
      user_id: 1,
      title: 'Content with Script',
      content_type: 'video',
      script: 'Hello everyone, welcome to my channel!'
    };

    const result = await createContent(input);
    expect(result.script).toEqual('Hello everyone, welcome to my channel!');
  });

  it('should create multiple content pieces for same user', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const inputs: CreateContentInput[] = [
      {
        user_id: 1,
        title: 'First Content',
        content_type: 'post'
      },
      {
        user_id: 1,
        title: 'Second Content',
        content_type: 'story'
      }
    ];

    const results = await Promise.all(inputs.map(input => createContent(input)));

    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('First Content');
    expect(results[1].title).toEqual('Second Content');
    expect(results[0].id).not.toEqual(results[1].id);
  });
});