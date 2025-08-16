import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, campaignsTable } from '../db/schema';
import { type CreateUserInput, type CreateCampaignInput } from '../schema';
import { getCampaignsByUser } from '../handlers/get_campaigns';
import { eq } from 'drizzle-orm';

// Test user input
const testUserInput: CreateUserInput = {
  email: 'testuser@example.com',
  username: 'testuser',
  full_name: 'Test User',
  bio: 'Test bio',
  profile_image_url: 'https://example.com/image.jpg'
};

// Test campaign inputs
const testCampaignInput1: CreateCampaignInput = {
  user_id: 1,
  name: 'Summer Campaign',
  description: 'A summer marketing campaign',
  start_date: new Date('2024-06-01'),
  end_date: new Date('2024-08-31'),
  budget: 5000.50,
  target_platforms: ['instagram', 'tiktok'],
  goals: 'Increase brand awareness'
};

const testCampaignInput2: CreateCampaignInput = {
  user_id: 1,
  name: 'Winter Campaign',
  description: 'A winter marketing campaign',
  start_date: new Date('2024-12-01'),
  end_date: new Date('2024-12-31'),
  budget: 3000.75,
  target_platforms: ['facebook', 'x'],
  goals: 'Drive sales'
};

const testCampaignInput3: CreateCampaignInput = {
  user_id: 2,
  name: 'Another User Campaign',
  description: 'Campaign for different user',
  start_date: new Date('2024-07-01'),
  budget: 2000.00,
  target_platforms: ['instagram'],
  goals: 'Test isolation'
};

describe('getCampaignsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no campaigns exist', async () => {
    // Create user but no campaigns
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    const result = await getCampaignsByUser(1);

    expect(result).toEqual([]);
  });

  it('should return all campaigns for a user when no status filter', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    // Create campaigns with different statuses
    await db.insert(campaignsTable).values([
      {
        user_id: testCampaignInput1.user_id,
        name: testCampaignInput1.name,
        description: testCampaignInput1.description,
        status: 'planning',
        start_date: testCampaignInput1.start_date,
        end_date: testCampaignInput1.end_date,
        budget: testCampaignInput1.budget?.toString(),
        target_platforms: testCampaignInput1.target_platforms,
        goals: testCampaignInput1.goals
      },
      {
        user_id: testCampaignInput2.user_id,
        name: testCampaignInput2.name,
        description: testCampaignInput2.description,
        status: 'active',
        start_date: testCampaignInput2.start_date,
        end_date: testCampaignInput2.end_date,
        budget: testCampaignInput2.budget?.toString(),
        target_platforms: testCampaignInput2.target_platforms,
        goals: testCampaignInput2.goals
      }
    ]).execute();

    const result = await getCampaignsByUser(1);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Summer Campaign');
    expect(result[0].status).toBe('planning');
    expect(result[0].budget).toBe(5000.50);
    expect(result[0].target_platforms).toEqual(['instagram', 'tiktok']);
    expect(result[1].name).toBe('Winter Campaign');
    expect(result[1].status).toBe('active');
    expect(result[1].budget).toBe(3000.75);
    expect(result[1].target_platforms).toEqual(['facebook', 'x']);
  });

  it('should filter campaigns by status when provided', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    // Create campaigns with different statuses
    await db.insert(campaignsTable).values([
      {
        user_id: testCampaignInput1.user_id,
        name: testCampaignInput1.name,
        description: testCampaignInput1.description,
        status: 'planning',
        start_date: testCampaignInput1.start_date,
        end_date: testCampaignInput1.end_date,
        budget: testCampaignInput1.budget?.toString(),
        target_platforms: testCampaignInput1.target_platforms,
        goals: testCampaignInput1.goals
      },
      {
        user_id: testCampaignInput2.user_id,
        name: testCampaignInput2.name,
        description: testCampaignInput2.description,
        status: 'active',
        start_date: testCampaignInput2.start_date,
        end_date: testCampaignInput2.end_date,
        budget: testCampaignInput2.budget?.toString(),
        target_platforms: testCampaignInput2.target_platforms,
        goals: testCampaignInput2.goals
      }
    ]).execute();

    const result = await getCampaignsByUser(1, 'active');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Winter Campaign');
    expect(result[0].status).toBe('active');
    expect(result[0].budget).toBe(3000.75);
  });

  it('should only return campaigns for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      {
        email: testUserInput.email,
        username: testUserInput.username,
        full_name: testUserInput.full_name,
        bio: testUserInput.bio,
        profile_image_url: testUserInput.profile_image_url
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        bio: 'Another test user',
        profile_image_url: 'https://example.com/user2.jpg'
      }
    ]).execute();

    // Create campaigns for both users
    await db.insert(campaignsTable).values([
      {
        user_id: testCampaignInput1.user_id,
        name: testCampaignInput1.name,
        description: testCampaignInput1.description,
        start_date: testCampaignInput1.start_date,
        end_date: testCampaignInput1.end_date,
        budget: testCampaignInput1.budget?.toString(),
        target_platforms: testCampaignInput1.target_platforms,
        goals: testCampaignInput1.goals
      },
      {
        user_id: testCampaignInput3.user_id,
        name: testCampaignInput3.name,
        description: testCampaignInput3.description,
        start_date: testCampaignInput3.start_date,
        budget: testCampaignInput3.budget?.toString(),
        target_platforms: testCampaignInput3.target_platforms,
        goals: testCampaignInput3.goals
      }
    ]).execute();

    const resultUser1 = await getCampaignsByUser(1);
    const resultUser2 = await getCampaignsByUser(2);

    expect(resultUser1).toHaveLength(1);
    expect(resultUser1[0].name).toBe('Summer Campaign');
    expect(resultUser1[0].user_id).toBe(1);

    expect(resultUser2).toHaveLength(1);
    expect(resultUser2[0].name).toBe('Another User Campaign');
    expect(resultUser2[0].user_id).toBe(2);
  });

  it('should handle campaigns with null budget correctly', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    // Create campaign with null budget
    await db.insert(campaignsTable).values({
      user_id: 1,
      name: 'No Budget Campaign',
      description: 'Campaign without budget',
      start_date: new Date('2024-06-01'),
      budget: null,
      target_platforms: ['instagram'],
      goals: 'Test null budget'
    }).execute();

    const result = await getCampaignsByUser(1);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('No Budget Campaign');
    expect(result[0].budget).toBeNull();
    expect(typeof result[0].budget).toBe('object'); // null is object type
  });

  it('should handle campaigns with empty target_platforms array', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    // Create campaign with empty platforms array
    await db.insert(campaignsTable).values({
      user_id: 1,
      name: 'No Platforms Campaign',
      description: 'Campaign without platforms',
      start_date: new Date('2024-06-01'),
      budget: '1000.00',
      target_platforms: [],
      goals: 'Test empty platforms'
    }).execute();

    const result = await getCampaignsByUser(1);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('No Platforms Campaign');
    expect(result[0].target_platforms).toEqual([]);
    expect(Array.isArray(result[0].target_platforms)).toBe(true);
  });

  it('should verify database persistence', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUserInput.email,
      username: testUserInput.username,
      full_name: testUserInput.full_name,
      bio: testUserInput.bio,
      profile_image_url: testUserInput.profile_image_url
    }).execute();

    // Create campaign
    const insertResult = await db.insert(campaignsTable).values({
      user_id: testCampaignInput1.user_id,
      name: testCampaignInput1.name,
      description: testCampaignInput1.description,
      start_date: testCampaignInput1.start_date,
      end_date: testCampaignInput1.end_date,
      budget: testCampaignInput1.budget?.toString(),
      target_platforms: testCampaignInput1.target_platforms,
      goals: testCampaignInput1.goals
    }).returning().execute();

    // Verify data was persisted correctly
    const campaignFromDB = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, insertResult[0].id))
      .execute();

    expect(campaignFromDB).toHaveLength(1);
    expect(campaignFromDB[0].name).toBe('Summer Campaign');
    expect(parseFloat(campaignFromDB[0].budget!)).toBe(5000.50);

    // Now test the handler
    const handlerResult = await getCampaignsByUser(1);
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].name).toBe('Summer Campaign');
    expect(handlerResult[0].budget).toBe(5000.50);
  });
});