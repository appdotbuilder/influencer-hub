import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { campaignMetricsTable, usersTable, campaignsTable } from '../db/schema';
import { type CreateCampaignMetricInput, type CreateUserInput, type CreateCampaignInput } from '../schema';
import { createCampaignMetric } from '../handlers/create_campaign_metric';
import { eq } from 'drizzle-orm';

describe('createCampaignMetric', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCampaignId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userInput: CreateUserInput = {
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      bio: 'Test bio',
      profile_image_url: 'https://example.com/image.jpg'
    };

    const userResult = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create prerequisite campaign
    const campaignInput: CreateCampaignInput = {
      user_id: testUserId,
      name: 'Test Campaign',
      description: 'A test campaign',
      start_date: new Date(),
      end_date: null,
      budget: 1000.00,
      target_platforms: ['instagram', 'tiktok'],
      goals: 'Increase engagement'
    };

    const campaignResult = await db.insert(campaignsTable)
      .values({
        ...campaignInput,
        budget: campaignInput.budget?.toString() || null,
        target_platforms: JSON.stringify(campaignInput.target_platforms)
      })
      .returning()
      .execute();

    testCampaignId = campaignResult[0].id;
  });

  const createTestInput = (overrides?: Partial<CreateCampaignMetricInput>): CreateCampaignMetricInput => ({
    campaign_id: testCampaignId,
    platform: 'instagram',
    metric_name: 'impressions',
    metric_value: 15000,
    measured_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides
  });

  it('should create a campaign metric with all fields', async () => {
    const testInput = createTestInput();
    const result = await createCampaignMetric(testInput);

    // Basic field validation
    expect(result.campaign_id).toEqual(testCampaignId);
    expect(result.platform).toEqual('instagram');
    expect(result.metric_name).toEqual('impressions');
    expect(result.metric_value).toEqual(15000);
    expect(typeof result.metric_value).toBe('number');
    expect(result.measured_at).toBeInstanceOf(Date);
    expect(result.measured_at.toISOString()).toEqual('2024-01-15T10:00:00.000Z');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a campaign metric with default measured_at when not provided', async () => {
    const testInput = createTestInput();
    delete testInput.measured_at;

    const beforeTime = Date.now();
    const result = await createCampaignMetric(testInput);
    const afterTime = Date.now();

    expect(result.measured_at).toBeInstanceOf(Date);
    expect(result.measured_at.getTime()).toBeGreaterThanOrEqual(beforeTime);
    expect(result.measured_at.getTime()).toBeLessThanOrEqual(afterTime);
  });

  it('should save campaign metric to database', async () => {
    const testInput = createTestInput();
    const result = await createCampaignMetric(testInput);

    // Query using proper drizzle syntax
    const metrics = await db.select()
      .from(campaignMetricsTable)
      .where(eq(campaignMetricsTable.id, result.id))
      .execute();

    expect(metrics).toHaveLength(1);
    const savedMetric = metrics[0];
    expect(savedMetric.campaign_id).toEqual(testCampaignId);
    expect(savedMetric.platform).toEqual('instagram');
    expect(savedMetric.metric_name).toEqual('impressions');
    expect(parseFloat(savedMetric.metric_value)).toEqual(15000);
    expect(savedMetric.measured_at).toBeInstanceOf(Date);
    expect(savedMetric.created_at).toBeInstanceOf(Date);
  });

  it('should handle different social platforms', async () => {
    const platforms = ['tiktok', 'instagram', 'x', 'facebook', 'onlyfans'] as const;

    for (const platform of platforms) {
      const testInput = createTestInput({
        platform: platform,
        metric_name: `${platform}_engagement`
      });

      const result = await createCampaignMetric(testInput);
      expect(result.platform).toEqual(platform);
      expect(result.metric_name).toEqual(`${platform}_engagement`);
    }
  });

  it('should handle different metric types and values', async () => {
    const metrics = [
      { name: 'impressions', value: 50000 },
      { name: 'clicks', value: 1250 },
      { name: 'engagement_rate', value: 3.45 },
      { name: 'cost_per_click', value: 0.75 },
      { name: 'conversion_rate', value: 12.5 }
    ];

    for (const metric of metrics) {
      const testInput = createTestInput({
        metric_name: metric.name,
        metric_value: metric.value
      });

      const result = await createCampaignMetric(testInput);
      expect(result.metric_name).toEqual(metric.name);
      expect(result.metric_value).toEqual(metric.value);
      expect(typeof result.metric_value).toBe('number');
    }
  });

  it('should handle large metric values', async () => {
    const testInput = createTestInput({
      metric_name: 'total_impressions',
      metric_value: 999999999.9999 // Large value with precision
    });

    const result = await createCampaignMetric(testInput);
    expect(result.metric_value).toEqual(999999999.9999);
    expect(typeof result.metric_value).toBe('number');
  });

  it('should throw error when campaign does not exist', async () => {
    const testInput = createTestInput({
      campaign_id: 99999 // Non-existent campaign
    });

    await expect(createCampaignMetric(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple metrics for same campaign', async () => {
    const metrics = [
      { metric_name: 'impressions', metric_value: 10000 },
      { metric_name: 'clicks', metric_value: 250 },
      { metric_name: 'conversions', metric_value: 15 }
    ];

    const results = [];
    for (const metric of metrics) {
      const testInput = createTestInput(metric);
      const result = await createCampaignMetric(testInput);
      results.push(result);
    }

    // Verify all metrics were created
    const allMetrics = await db.select()
      .from(campaignMetricsTable)
      .where(eq(campaignMetricsTable.campaign_id, testCampaignId))
      .execute();

    expect(allMetrics).toHaveLength(3);
    expect(allMetrics.map(m => m.metric_name).sort()).toEqual(['clicks', 'conversions', 'impressions']);
  });

  it('should handle zero and negative metric values', async () => {
    const testCases = [
      { metric_name: 'zero_value', metric_value: 0 },
      { metric_name: 'negative_value', metric_value: -5.5 }
    ];

    for (const testCase of testCases) {
      const testInput = createTestInput(testCase);
      const result = await createCampaignMetric(testInput);
      
      expect(result.metric_value).toEqual(testCase.metric_value);
      expect(typeof result.metric_value).toBe('number');
    }
  });
});