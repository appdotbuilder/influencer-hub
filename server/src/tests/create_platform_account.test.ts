import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { platformAccountsTable, usersTable } from '../db/schema';
import { type CreatePlatformAccountInput, type CreateUserInput } from '../schema';
import { createPlatformAccount } from '../handlers/create_platform_account';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'influencer@test.com',
  username: 'testinfluencer',
  full_name: 'Test Influencer',
  bio: 'Social media influencer',
  profile_image_url: 'https://example.com/profile.jpg'
};

// Test platform account input
const testPlatformAccountInput: CreatePlatformAccountInput = {
  user_id: 1, // Will be updated with actual user ID
  platform: 'instagram',
  platform_user_id: 'insta_12345',
  username: 'test_instagram',
  access_token: 'access_token_123',
  refresh_token: 'refresh_token_456',
  token_expires_at: new Date('2025-12-31T23:59:59.000Z'),
  followers_count: 5000,
  following_count: 1200
};

describe('createPlatformAccount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a platform account with all fields', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testPlatformAccountInput, user_id: userId };

    const result = await createPlatformAccount(input);

    // Validate all fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.platform).toEqual('instagram');
    expect(result.platform_user_id).toEqual('insta_12345');
    expect(result.username).toEqual('test_instagram');
    expect(result.access_token).toEqual('access_token_123');
    expect(result.refresh_token).toEqual('refresh_token_456');
    expect(result.token_expires_at).toEqual(testPlatformAccountInput.token_expires_at || null);
    expect(result.is_active).toEqual(true);
    expect(result.followers_count).toEqual(5000);
    expect(result.following_count).toEqual(1200);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create platform account with minimal required fields', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const minimalInput: CreatePlatformAccountInput = {
      user_id: userId,
      platform: 'tiktok',
      platform_user_id: 'tiktok_789',
      username: 'test_tiktok'
    };

    const result = await createPlatformAccount(minimalInput);

    expect(result.user_id).toEqual(userId);
    expect(result.platform).toEqual('tiktok');
    expect(result.platform_user_id).toEqual('tiktok_789');
    expect(result.username).toEqual('test_tiktok');
    expect(result.access_token).toBeNull();
    expect(result.refresh_token).toBeNull();
    expect(result.token_expires_at).toBeNull();
    expect(result.is_active).toEqual(true);
    expect(result.followers_count).toEqual(0);
    expect(result.following_count).toEqual(0);
  });

  it('should save platform account to database', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testPlatformAccountInput, user_id: userId };

    const result = await createPlatformAccount(input);

    // Query database to verify data was saved
    const platformAccounts = await db.select()
      .from(platformAccountsTable)
      .where(eq(platformAccountsTable.id, result.id))
      .execute();

    expect(platformAccounts).toHaveLength(1);
    const savedAccount = platformAccounts[0];
    expect(savedAccount.user_id).toEqual(userId);
    expect(savedAccount.platform).toEqual('instagram');
    expect(savedAccount.platform_user_id).toEqual('insta_12345');
    expect(savedAccount.username).toEqual('test_instagram');
    expect(savedAccount.access_token).toEqual('access_token_123');
    expect(savedAccount.followers_count).toEqual(5000);
    expect(savedAccount.is_active).toEqual(true);
  });

  it('should handle different social platforms correctly', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test different platforms
    const platforms = ['instagram', 'tiktok', 'x', 'facebook', 'onlyfans'] as const;
    
    for (const platform of platforms) {
      const input: CreatePlatformAccountInput = {
        user_id: userId,
        platform: platform,
        platform_user_id: `${platform}_123`,
        username: `test_${platform}`,
        followers_count: 1000,
        following_count: 500
      };

      const result = await createPlatformAccount(input);
      expect(result.platform).toEqual(platform);
      expect(result.platform_user_id).toEqual(`${platform}_123`);
      expect(result.username).toEqual(`test_${platform}`);
    }
  });

  it('should throw error when user does not exist', async () => {
    const input: CreatePlatformAccountInput = {
      user_id: 99999, // Non-existent user ID
      platform: 'instagram',
      platform_user_id: 'insta_12345',
      username: 'test_instagram'
    };

    await expect(createPlatformAccount(input)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle token expiration dates correctly', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const futureDate = new Date('2030-01-01T00:00:00.000Z');
    
    const input: CreatePlatformAccountInput = {
      user_id: userId,
      platform: 'facebook',
      platform_user_id: 'fb_456',
      username: 'test_facebook',
      access_token: 'fb_token_123',
      token_expires_at: futureDate
    };

    const result = await createPlatformAccount(input);

    expect(result.token_expires_at).toEqual(futureDate);
    expect(result.access_token).toEqual('fb_token_123');
  });

  it('should create multiple platform accounts for same user', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create Instagram account
    const instagramInput: CreatePlatformAccountInput = {
      user_id: userId,
      platform: 'instagram',
      platform_user_id: 'insta_123',
      username: 'user_instagram'
    };

    // Create TikTok account
    const tiktokInput: CreatePlatformAccountInput = {
      user_id: userId,
      platform: 'tiktok',
      platform_user_id: 'tiktok_456',
      username: 'user_tiktok'
    };

    const instagramResult = await createPlatformAccount(instagramInput);
    const tiktokResult = await createPlatformAccount(tiktokInput);

    // Both should be created successfully
    expect(instagramResult.user_id).toEqual(userId);
    expect(instagramResult.platform).toEqual('instagram');
    expect(tiktokResult.user_id).toEqual(userId);
    expect(tiktokResult.platform).toEqual('tiktok');
    expect(instagramResult.id).not.toEqual(tiktokResult.id);

    // Verify both are in database
    const allAccounts = await db.select()
      .from(platformAccountsTable)
      .where(eq(platformAccountsTable.user_id, userId))
      .execute();

    expect(allAccounts).toHaveLength(2);
  });
});