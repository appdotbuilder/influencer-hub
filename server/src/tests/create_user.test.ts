import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs with all fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  bio: 'This is a test bio',
  profile_image_url: 'https://example.com/profile.jpg'
};

const minimalTestInput: CreateUserInput = {
  email: 'minimal@example.com',
  username: 'minimal',
  full_name: 'Minimal User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('This is a test bio');
    expect(result.profile_image_url).toEqual('https://example.com/profile.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal fields', async () => {
    const result = await createUser(minimalTestInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimal');
    expect(result.full_name).toEqual('Minimal User');
    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].bio).toEqual('This is a test bio');
    expect(users[0].profile_image_url).toEqual('https://example.com/profile.jpg');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateEmailInput = {
      ...testInput,
      username: 'different_username'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/duplicate key/i);
  });

  it('should enforce username uniqueness constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same username
    const duplicateUsernameInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/duplicate key/i);
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNulls: CreateUserInput = {
      email: 'nulls@example.com',
      username: 'nulluser',
      full_name: 'Null User',
      bio: null,
      profile_image_url: null
    };

    const result = await createUser(inputWithNulls);

    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
  });

  it('should create multiple users successfully', async () => {
    const user1 = await createUser({
      email: 'user1@example.com',
      username: 'user1',
      full_name: 'User One'
    });

    const user2 = await createUser({
      email: 'user2@example.com',
      username: 'user2',
      full_name: 'User Two'
    });

    expect(user1.id).toBeDefined();
    expect(user2.id).toBeDefined();
    expect(user1.id).not.toEqual(user2.id);

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});