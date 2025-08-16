import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { trendsTable } from '../db/schema';
import { type CreateTrendInput } from '../schema';
import { createTrend } from '../handlers/create_trend';
import { eq, and, gte } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTrendInput = {
  platform: 'tiktok',
  hashtag: '#viraltrend',
  keyword: 'viral',
  volume: 50000,
  engagement_rate: 15.75,
  sentiment_score: 0.85,
  trending_score: 92.5
};

// Test input without optional fields
const minimalInput: CreateTrendInput = {
  platform: 'instagram',
  hashtag: '#minimal',
  volume: 1000,
  engagement_rate: 5.0,
  sentiment_score: 0.0,
  trending_score: 25.0
};

describe('createTrend', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a trend with all fields', async () => {
    const result = await createTrend(testInput);

    // Verify all field values and types
    expect(result.platform).toEqual('tiktok');
    expect(result.hashtag).toEqual('#viraltrend');
    expect(result.keyword).toEqual('viral');
    expect(result.volume).toEqual(50000);
    expect(result.engagement_rate).toEqual(15.75);
    expect(typeof result.engagement_rate).toEqual('number');
    expect(result.sentiment_score).toEqual(0.85);
    expect(typeof result.sentiment_score).toEqual('number');
    expect(result.trending_score).toEqual(92.5);
    expect(typeof result.trending_score).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.detected_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a trend with minimal fields', async () => {
    const result = await createTrend(minimalInput);

    // Verify required fields
    expect(result.platform).toEqual('instagram');
    expect(result.hashtag).toEqual('#minimal');
    expect(result.keyword).toBeNull();
    expect(result.volume).toEqual(1000);
    expect(result.engagement_rate).toEqual(5.0);
    expect(result.sentiment_score).toEqual(0.0);
    expect(result.trending_score).toEqual(25.0);
    expect(result.id).toBeDefined();
    expect(result.detected_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save trend to database correctly', async () => {
    const result = await createTrend(testInput);

    // Query database to verify storage
    const trends = await db.select()
      .from(trendsTable)
      .where(eq(trendsTable.id, result.id))
      .execute();

    expect(trends).toHaveLength(1);
    const savedTrend = trends[0];
    
    expect(savedTrend.platform).toEqual('tiktok');
    expect(savedTrend.hashtag).toEqual('#viraltrend');
    expect(savedTrend.keyword).toEqual('viral');
    expect(savedTrend.volume).toEqual(50000);
    
    // Verify numeric fields are stored correctly (as strings in DB)
    expect(parseFloat(savedTrend.engagement_rate)).toEqual(15.75);
    expect(parseFloat(savedTrend.sentiment_score)).toEqual(0.85);
    expect(parseFloat(savedTrend.trending_score)).toEqual(92.5);
    
    expect(savedTrend.detected_at).toBeInstanceOf(Date);
    expect(savedTrend.created_at).toBeInstanceOf(Date);
  });

  it('should handle different social platforms', async () => {
    const platforms = ['tiktok', 'instagram', 'x', 'facebook', 'onlyfans'] as const;
    
    for (const platform of platforms) {
      const input: CreateTrendInput = {
        platform,
        hashtag: `#${platform}trend`,
        volume: 1000,
        engagement_rate: 10.0,
        sentiment_score: 0.5,
        trending_score: 50.0
      };
      
      const result = await createTrend(input);
      expect(result.platform).toEqual(platform);
      expect(result.hashtag).toEqual(`#${platform}trend`);
    }
  });

  it('should handle edge case numeric values', async () => {
    const edgeCaseInput: CreateTrendInput = {
      platform: 'instagram',
      hashtag: '#edgecase',
      volume: 0, // minimum volume
      engagement_rate: 0.01, // very low engagement
      sentiment_score: -1.0, // maximum negative sentiment
      trending_score: 0.0 // minimum trending score
    };

    const result = await createTrend(edgeCaseInput);
    
    expect(result.volume).toEqual(0);
    expect(result.engagement_rate).toEqual(0.01);
    expect(result.sentiment_score).toEqual(-1.0);
    expect(result.trending_score).toEqual(0.0);
  });

  it('should set detected_at to current time', async () => {
    const beforeCreation = new Date();
    const result = await createTrend(testInput);
    const afterCreation = new Date();

    expect(result.detected_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.detected_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should query trends by platform and time range', async () => {
    // Create trends on different platforms
    await createTrend({
      platform: 'tiktok',
      hashtag: '#test1',
      volume: 1000,
      engagement_rate: 10.0,
      sentiment_score: 0.5,
      trending_score: 50.0
    });

    await createTrend({
      platform: 'instagram',
      hashtag: '#test2',
      volume: 2000,
      engagement_rate: 15.0,
      sentiment_score: 0.7,
      trending_score: 75.0
    });

    // Query TikTok trends from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const tiktokTrends = await db.select()
      .from(trendsTable)
      .where(
        and(
          eq(trendsTable.platform, 'tiktok'),
          gte(trendsTable.detected_at, oneHourAgo)
        )
      )
      .execute();

    expect(tiktokTrends).toHaveLength(1);
    expect(tiktokTrends[0].platform).toEqual('tiktok');
    expect(tiktokTrends[0].hashtag).toEqual('#test1');
  });

  it('should allow duplicate hashtags on different platforms', async () => {
    const duplicateHashtag = '#popular';
    
    // Create same hashtag on different platforms
    const tiktokTrend = await createTrend({
      platform: 'tiktok',
      hashtag: duplicateHashtag,
      volume: 5000,
      engagement_rate: 12.0,
      sentiment_score: 0.6,
      trending_score: 60.0
    });

    const instagramTrend = await createTrend({
      platform: 'instagram',
      hashtag: duplicateHashtag,
      volume: 3000,
      engagement_rate: 8.0,
      sentiment_score: 0.4,
      trending_score: 40.0
    });

    // Both should be created successfully
    expect(tiktokTrend.hashtag).toEqual(duplicateHashtag);
    expect(instagramTrend.hashtag).toEqual(duplicateHashtag);
    expect(tiktokTrend.platform).toEqual('tiktok');
    expect(instagramTrend.platform).toEqual('instagram');
    expect(tiktokTrend.id).not.toEqual(instagramTrend.id);
  });
});