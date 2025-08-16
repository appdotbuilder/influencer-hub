import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { campaignsTable, usersTable } from '../db/schema';
import { type CreateCampaignInput, type CreateUserInput } from '../schema';
import { createCampaign } from '../handlers/create_campaign';
import { eq } from 'drizzle-orm';

// Create test user first since campaigns require valid user_id
const createTestUser = async (): Promise<number> => {
  const userInput: CreateUserInput = {
    email: 'testuser@example.com',
    username: 'testuser',
    full_name: 'Test User',
    bio: 'A user for testing campaigns',
    profile_image_url: 'https://example.com/avatar.jpg'
  };

  const result = await db.insert(usersTable)
    .values({
      email: userInput.email,
      username: userInput.username,
      full_name: userInput.full_name,
      bio: userInput.bio,
      profile_image_url: userInput.profile_image_url
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('createCampaign', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    testUserId = await createTestUser();
  });

  afterEach(resetDB);

  it('should create a campaign with all fields', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-01');
    
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Test Campaign',
      description: 'A campaign for testing',
      start_date: startDate,
      end_date: endDate,
      budget: 1000.50,
      target_platforms: ['instagram', 'tiktok'],
      goals: 'Increase brand awareness'
    };

    const result = await createCampaign(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Campaign');
    expect(result.description).toEqual('A campaign for testing');
    expect(result.user_id).toEqual(testUserId);
    expect(result.status).toEqual('planning');
    expect(result.start_date).toEqual(startDate);
    expect(result.end_date).toEqual(endDate);
    expect(result.budget).toEqual(1000.50);
    expect(typeof result.budget).toBe('number');
    expect(result.target_platforms).toEqual(['instagram', 'tiktok']);
    expect(result.goals).toEqual('Increase brand awareness');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a campaign with minimal required fields', async () => {
    const startDate = new Date('2024-01-01');
    
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Minimal Campaign',
      start_date: startDate,
      target_platforms: ['x']
    };

    const result = await createCampaign(testInput);

    expect(result.name).toEqual('Minimal Campaign');
    expect(result.description).toBeNull();
    expect(result.end_date).toBeNull();
    expect(result.budget).toBeNull();
    expect(result.goals).toBeNull();
    expect(result.target_platforms).toEqual(['x']);
    expect(result.start_date).toEqual(startDate);
    expect(result.status).toEqual('planning');
  });

  it('should save campaign to database correctly', async () => {
    const startDate = new Date('2024-01-01');
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Database Test Campaign',
      start_date: startDate,
      budget: 500.75,
      target_platforms: ['facebook', 'onlyfans']
    };

    const result = await createCampaign(testInput);

    // Query database to verify data was saved correctly
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, result.id))
      .execute();

    expect(campaigns).toHaveLength(1);
    const savedCampaign = campaigns[0];
    expect(savedCampaign.name).toEqual('Database Test Campaign');
    expect(savedCampaign.user_id).toEqual(testUserId);
    expect(parseFloat(savedCampaign.budget as string)).toEqual(500.75);
    expect(savedCampaign.target_platforms).toEqual(['facebook', 'onlyfans']); // JSONB is already an array
    expect(savedCampaign.created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple target platforms correctly', async () => {
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Multi-Platform Campaign',
      start_date: new Date('2024-01-01'),
      target_platforms: ['tiktok', 'instagram', 'x', 'facebook', 'onlyfans']
    };

    const result = await createCampaign(testInput);

    expect(result.target_platforms).toHaveLength(5);
    expect(result.target_platforms).toEqual(['tiktok', 'instagram', 'x', 'facebook', 'onlyfans']);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateCampaignInput = {
      user_id: 99999, // Non-existent user ID
      name: 'Invalid User Campaign',
      start_date: new Date('2024-01-01'),
      target_platforms: ['instagram']
    };

    await expect(createCampaign(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error when start date is after end date', async () => {
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Invalid Date Campaign',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-01-01'), // End date before start date
      target_platforms: ['instagram']
    };

    await expect(createCampaign(testInput)).rejects.toThrow(/Start date must be before end date/i);
  });

  it('should throw error when start date equals end date', async () => {
    const sameDate = new Date('2024-01-01');
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Same Date Campaign',
      start_date: sameDate,
      end_date: sameDate, // Same date
      target_platforms: ['instagram']
    };

    await expect(createCampaign(testInput)).rejects.toThrow(/Start date must be before end date/i);
  });

  it('should handle zero budget correctly', async () => {
    const testInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Zero Budget Campaign',
      start_date: new Date('2024-01-01'),
      budget: 0,
      target_platforms: ['tiktok']
    };

    // Note: Zod schema requires positive budget, but this tests handler robustness
    // In real usage, this would be caught by Zod validation before reaching handler
    const result = await createCampaign(testInput);
    expect(result.budget).toEqual(0);
    expect(typeof result.budget).toBe('number');
  });
});