import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    email: 'alice@example.com',
    username: 'alice_creator',
    full_name: 'Alice Johnson',
    bio: 'Content creator and influencer',
    profile_image_url: 'https://example.com/alice.jpg'
  },
  {
    email: 'bob@example.com',
    username: 'bob_tiktoker',
    full_name: 'Bob Smith',
    bio: null,
    profile_image_url: null
  },
  {
    email: 'charlie@example.com',
    username: 'charlie_insta',
    full_name: 'Charlie Brown',
    bio: 'Instagram model and lifestyle blogger',
    profile_image_url: 'https://example.com/charlie.jpg'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users when users exist', async () => {
    // Create test users directly in database
    await db.insert(usersTable)
      .values(testUsers.map(user => ({
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        bio: user.bio,
        profile_image_url: user.profile_image_url
      })))
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check that all users are returned
    const emails = result.map(user => user.email);
    expect(emails).toContain('alice@example.com');
    expect(emails).toContain('bob@example.com');
    expect(emails).toContain('charlie@example.com');
  });

  it('should return users with all required fields', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values({
        email: testUsers[0].email,
        username: testUsers[0].username,
        full_name: testUsers[0].full_name,
        bio: testUsers[0].bio,
        profile_image_url: testUsers[0].profile_image_url
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Check all required fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toBe('alice@example.com');
    expect(user.username).toBe('alice_creator');
    expect(user.full_name).toBe('Alice Johnson');
    expect(user.bio).toBe('Content creator and influencer');
    expect(user.profile_image_url).toBe('https://example.com/alice.jpg');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Create user with null bio and profile_image_url
    await db.insert(usersTable)
      .values({
        email: testUsers[1].email,
        username: testUsers[1].username,
        full_name: testUsers[1].full_name,
        bio: testUsers[1].bio,
        profile_image_url: testUsers[1].profile_image_url
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    expect(user.email).toBe('bob@example.com');
    expect(user.username).toBe('bob_tiktoker');
    expect(user.full_name).toBe('Bob Smith');
    expect(user.bio).toBeNull();
    expect(user.profile_image_url).toBeNull();
  });

  it('should return users ordered by creation date (newest first)', async () => {
    // Create users with slight delay to ensure different timestamps
    await db.insert(usersTable)
      .values({
        email: 'first@example.com',
        username: 'first_user',
        full_name: 'First User'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        username: 'second_user',
        full_name: 'Second User'
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(usersTable)
      .values({
        email: 'third@example.com',
        username: 'third_user',
        full_name: 'Third User'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check ordering - newest should be first
    expect(result[0].email).toBe('third@example.com');
    expect(result[1].email).toBe('second@example.com');
    expect(result[2].email).toBe('first@example.com');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should return users with consistent data types', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values(testUsers.map(user => ({
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        bio: user.bio,
        profile_image_url: user.profile_image_url
      })))
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Check that all users have consistent types
    result.forEach(user => {
      expect(typeof user.id).toBe('number');
      expect(typeof user.email).toBe('string');
      expect(typeof user.username).toBe('string');
      expect(typeof user.full_name).toBe('string');
      expect(user.bio === null || typeof user.bio === 'string').toBe(true);
      expect(user.profile_image_url === null || typeof user.profile_image_url === 'string').toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle large number of users efficiently', async () => {
    // Create many users
    const manyUsers = Array.from({ length: 50 }, (_, index) => ({
      email: `user${index}@example.com`,
      username: `user_${index}`,
      full_name: `User ${index}`,
      bio: index % 2 === 0 ? `Bio for user ${index}` : null,
      profile_image_url: index % 3 === 0 ? `https://example.com/user${index}.jpg` : null
    }));

    await db.insert(usersTable)
      .values(manyUsers)
      .execute();

    const startTime = Date.now();
    const result = await getUsers();
    const endTime = Date.now();

    expect(result).toHaveLength(50);
    
    // Performance check - should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

    // Verify ordering is maintained even with many records
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(result[i + 1].created_at.getTime());
    }
  });
});