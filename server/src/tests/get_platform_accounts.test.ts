import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, platformAccountsTable } from '../db/schema';
import { type CreateUserInput, type CreatePlatformAccountInput } from '../schema';
import { getPlatformAccountsByUser } from '../handlers/get_platform_accounts';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'influencer@example.com',
  username: 'testinfluencer',
  full_name: 'Test Influencer',
  bio: 'Content creator and social media influencer',
  profile_image_url: 'https://example.com/profile.jpg'
};

const testPlatformAccount1: CreatePlatformAccountInput = {
  user_id: 0, // Will be set after user creation
  platform: 'instagram',
  platform_user_id: 'insta_123456',
  username: 'test_instagram',
  access_token: 'instagram_access_token',
  refresh_token: 'instagram_refresh_token',
  token_expires_at: new Date('2024-12-31T23:59:59Z'),
  followers_count: 10000,
  following_count: 500
};

const testPlatformAccount2: CreatePlatformAccountInput = {
  user_id: 0, // Will be set after user creation
  platform: 'tiktok',
  platform_user_id: 'tiktok_789012',
  username: 'test_tiktok',
  access_token: null,
  refresh_token: null,
  token_expires_at: null,
  followers_count: 25000,
  following_count: 100
};

describe('getPlatformAccountsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return platform accounts for a valid user', async () => {
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

    // Create platform accounts
    await db.insert(platformAccountsTable)
      .values([
        {
          ...testPlatformAccount1,
          user_id: userId
        },
        {
          ...testPlatformAccount2,
          user_id: userId
        }
      ])
      .execute();

    // Test the handler
    const result = await getPlatformAccountsByUser(userId);

    expect(result).toHaveLength(2);
    
    // Check first account
    const instagramAccount = result.find(account => account.platform === 'instagram');
    expect(instagramAccount).toBeDefined();
    expect(instagramAccount!.user_id).toBe(userId);
    expect(instagramAccount!.platform_user_id).toBe('insta_123456');
    expect(instagramAccount!.username).toBe('test_instagram');
    expect(instagramAccount!.access_token).toBe('instagram_access_token');
    expect(instagramAccount!.refresh_token).toBe('instagram_refresh_token');
    expect(instagramAccount!.token_expires_at).toBeInstanceOf(Date);
    expect(instagramAccount!.followers_count).toBe(10000);
    expect(instagramAccount!.following_count).toBe(500);
    expect(instagramAccount!.is_active).toBe(true);
    expect(instagramAccount!.created_at).toBeInstanceOf(Date);
    expect(instagramAccount!.updated_at).toBeInstanceOf(Date);

    // Check second account
    const tiktokAccount = result.find(account => account.platform === 'tiktok');
    expect(tiktokAccount).toBeDefined();
    expect(tiktokAccount!.user_id).toBe(userId);
    expect(tiktokAccount!.platform_user_id).toBe('tiktok_789012');
    expect(tiktokAccount!.username).toBe('test_tiktok');
    expect(tiktokAccount!.access_token).toBe(null);
    expect(tiktokAccount!.refresh_token).toBe(null);
    expect(tiktokAccount!.token_expires_at).toBe(null);
    expect(tiktokAccount!.followers_count).toBe(25000);
    expect(tiktokAccount!.following_count).toBe(100);
  });

  it('should return empty array for user with no platform accounts', async () => {
    // Create test user without platform accounts
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

    // Test the handler
    const result = await getPlatformAccountsByUser(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(getPlatformAccountsByUser(nonExistentUserId))
      .rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle accounts with different platforms correctly', async () => {
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

    // Create accounts for all supported platforms
    await db.insert(platformAccountsTable)
      .values([
        {
          user_id: userId,
          platform: 'instagram',
          platform_user_id: 'insta_123',
          username: 'test_insta',
          followers_count: 5000,
          following_count: 300
        },
        {
          user_id: userId,
          platform: 'tiktok',
          platform_user_id: 'tiktok_456',
          username: 'test_tiktok',
          followers_count: 15000,
          following_count: 150
        },
        {
          user_id: userId,
          platform: 'x',
          platform_user_id: 'x_789',
          username: 'test_x',
          followers_count: 2500,
          following_count: 500
        },
        {
          user_id: userId,
          platform: 'facebook',
          platform_user_id: 'fb_012',
          username: 'test_facebook',
          followers_count: 8000,
          following_count: 200
        },
        {
          user_id: userId,
          platform: 'onlyfans',
          platform_user_id: 'of_345',
          username: 'test_onlyfans',
          followers_count: 1200,
          following_count: 50
        }
      ])
      .execute();

    // Test the handler
    const result = await getPlatformAccountsByUser(userId);

    expect(result).toHaveLength(5);
    
    const platforms = result.map(account => account.platform);
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('tiktok');
    expect(platforms).toContain('x');
    expect(platforms).toContain('facebook');
    expect(platforms).toContain('onlyfans');

    // Verify each account has the correct user_id
    result.forEach(account => {
      expect(account.user_id).toBe(userId);
      expect(typeof account.followers_count).toBe('number');
      expect(typeof account.following_count).toBe('number');
      expect(typeof account.is_active).toBe('boolean');
      expect(account.created_at).toBeInstanceOf(Date);
      expect(account.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return accounts ordered by platform naturally', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create accounts in non-alphabetical order
    await db.insert(platformAccountsTable)
      .values([
        {
          user_id: userId,
          platform: 'x',
          platform_user_id: 'x_123',
          username: 'test_x',
          followers_count: 1000,
          following_count: 100
        },
        {
          user_id: userId,
          platform: 'instagram',
          platform_user_id: 'insta_456',
          username: 'test_insta',
          followers_count: 2000,
          following_count: 200
        }
      ])
      .execute();

    // Test the handler
    const result = await getPlatformAccountsByUser(userId);

    expect(result).toHaveLength(2);
    
    // Verify both accounts are returned regardless of insertion order
    const platforms = result.map(account => account.platform);
    expect(platforms).toContain('x');
    expect(platforms).toContain('instagram');
  });

  it('should verify platform accounts are saved correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create platform account
    await db.insert(platformAccountsTable)
      .values({
        user_id: userId,
        platform: 'instagram',
        platform_user_id: 'test_123',
        username: 'test_account',
        access_token: 'test_token',
        followers_count: 5000,
        following_count: 300
      })
      .execute();

    // Test the handler
    const result = await getPlatformAccountsByUser(userId);

    // Verify database persistence by checking result
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe('instagram');
    expect(result[0].platform_user_id).toBe('test_123');
    expect(result[0].access_token).toBe('test_token');

    // Double-check by querying database directly
    const dbAccounts = await db.select()
      .from(platformAccountsTable)
      .where(eq(platformAccountsTable.user_id, userId))
      .execute();

    expect(dbAccounts).toHaveLength(1);
    expect(dbAccounts[0].platform).toBe('instagram');
    expect(dbAccounts[0].platform_user_id).toBe('test_123');
    expect(dbAccounts[0].access_token).toBe('test_token');
  });
});