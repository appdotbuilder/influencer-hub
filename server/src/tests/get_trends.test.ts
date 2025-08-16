import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { trendsTable } from '../db/schema';
import { type CreateTrendInput } from '../schema';
import { getTrends } from '../handlers/get_trends';

// Helper function to create trend data
const createTrendData = (overrides: Partial<CreateTrendInput> = {}): CreateTrendInput => ({
  platform: 'tiktok',
  hashtag: '#testhashtag',
  keyword: 'test keyword',
  volume: 1000,
  engagement_rate: 85.5,
  sentiment_score: 0.75,
  trending_score: 92.3,
  ...overrides
});

describe('getTrends', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no trends exist', async () => {
    const result = await getTrends();
    expect(result).toEqual([]);
  });

  it('should return all trends ordered by trending_score then recency', async () => {
    // Create trends with different scores and times
    const trend1Data = createTrendData({
      hashtag: '#trend1',
      trending_score: 85.0,
      platform: 'instagram'
    });

    const trend2Data = createTrendData({
      hashtag: '#trend2',
      trending_score: 95.0,
      platform: 'tiktok'
    });

    const trend3Data = createTrendData({
      hashtag: '#trend3',
      trending_score: 90.0,
      platform: 'x'
    });

    // Insert trends in different order than expected result
    await db.insert(trendsTable).values([
      {
        ...trend1Data,
        engagement_rate: trend1Data.engagement_rate.toString(),
        sentiment_score: trend1Data.sentiment_score.toString(),
        trending_score: trend1Data.trending_score.toString()
      },
      {
        ...trend3Data,
        engagement_rate: trend3Data.engagement_rate.toString(),
        sentiment_score: trend3Data.sentiment_score.toString(),
        trending_score: trend3Data.trending_score.toString()
      },
      {
        ...trend2Data,
        engagement_rate: trend2Data.engagement_rate.toString(),
        sentiment_score: trend2Data.sentiment_score.toString(),
        trending_score: trend2Data.trending_score.toString()
      }
    ]).execute();

    const result = await getTrends();

    expect(result).toHaveLength(3);
    
    // Should be ordered by trending_score descending
    expect(result[0].hashtag).toBe('#trend2'); // 95.0
    expect(result[1].hashtag).toBe('#trend3'); // 90.0
    expect(result[2].hashtag).toBe('#trend1'); // 85.0

    // Verify numeric conversions
    expect(typeof result[0].trending_score).toBe('number');
    expect(typeof result[0].engagement_rate).toBe('number');
    expect(typeof result[0].sentiment_score).toBe('number');
    
    expect(result[0].trending_score).toBe(95.0);
    expect(result[0].engagement_rate).toBe(85.5);
    expect(result[0].sentiment_score).toBe(0.75);
  });

  it('should filter trends by platform correctly', async () => {
    // Create trends for different platforms
    const tiktokTrend = createTrendData({
      platform: 'tiktok',
      hashtag: '#tiktoktrend'
    });

    const instagramTrend = createTrendData({
      platform: 'instagram',
      hashtag: '#instatrend'
    });

    const xTrend = createTrendData({
      platform: 'x',
      hashtag: '#xtrend'
    });

    await db.insert(trendsTable).values([
      {
        ...tiktokTrend,
        engagement_rate: tiktokTrend.engagement_rate.toString(),
        sentiment_score: tiktokTrend.sentiment_score.toString(),
        trending_score: tiktokTrend.trending_score.toString()
      },
      {
        ...instagramTrend,
        engagement_rate: instagramTrend.engagement_rate.toString(),
        sentiment_score: instagramTrend.sentiment_score.toString(),
        trending_score: instagramTrend.trending_score.toString()
      },
      {
        ...xTrend,
        engagement_rate: xTrend.engagement_rate.toString(),
        sentiment_score: xTrend.sentiment_score.toString(),
        trending_score: xTrend.trending_score.toString()
      }
    ]).execute();

    // Test filtering by TikTok
    const tiktokResults = await getTrends('tiktok');
    expect(tiktokResults).toHaveLength(1);
    expect(tiktokResults[0].platform).toBe('tiktok');
    expect(tiktokResults[0].hashtag).toBe('#tiktoktrend');

    // Test filtering by Instagram
    const instagramResults = await getTrends('instagram');
    expect(instagramResults).toHaveLength(1);
    expect(instagramResults[0].platform).toBe('instagram');
    expect(instagramResults[0].hashtag).toBe('#instatrend');

    // Test filtering by X
    const xResults = await getTrends('x');
    expect(xResults).toHaveLength(1);
    expect(xResults[0].platform).toBe('x');
    expect(xResults[0].hashtag).toBe('#xtrend');
  });

  it('should respect the limit parameter', async () => {
    // Create 5 trends
    const trendPromises = Array.from({ length: 5 }, (_, i) => {
      const trendData = createTrendData({
        hashtag: `#trend${i}`,
        trending_score: 90 - i // Different scores for ordering
      });
      
      return db.insert(trendsTable).values({
        ...trendData,
        engagement_rate: trendData.engagement_rate.toString(),
        sentiment_score: trendData.sentiment_score.toString(),
        trending_score: trendData.trending_score.toString()
      }).execute();
    });

    await Promise.all(trendPromises);

    // Test limit of 3
    const limitedResults = await getTrends(undefined, 3);
    expect(limitedResults).toHaveLength(3);
    
    // Should get the top 3 by trending_score
    expect(limitedResults[0].hashtag).toBe('#trend0'); // 90
    expect(limitedResults[1].hashtag).toBe('#trend1'); // 89
    expect(limitedResults[2].hashtag).toBe('#trend2'); // 88

    // Test limit of 1
    const singleResult = await getTrends(undefined, 1);
    expect(singleResult).toHaveLength(1);
    expect(singleResult[0].hashtag).toBe('#trend0');
  });

  it('should handle platform filtering with limit', async () => {
    // Create mixed platform trends
    const trends = [
      createTrendData({ platform: 'tiktok', hashtag: '#tiktok1', trending_score: 95 }),
      createTrendData({ platform: 'tiktok', hashtag: '#tiktok2', trending_score: 90 }),
      createTrendData({ platform: 'tiktok', hashtag: '#tiktok3', trending_score: 85 }),
      createTrendData({ platform: 'instagram', hashtag: '#insta1', trending_score: 88 }),
      createTrendData({ platform: 'instagram', hashtag: '#insta2', trending_score: 82 })
    ];

    const insertPromises = trends.map(trend =>
      db.insert(trendsTable).values({
        ...trend,
        engagement_rate: trend.engagement_rate.toString(),
        sentiment_score: trend.sentiment_score.toString(),
        trending_score: trend.trending_score.toString()
      }).execute()
    );

    await Promise.all(insertPromises);

    // Filter by TikTok with limit 2
    const tiktokResults = await getTrends('tiktok', 2);
    expect(tiktokResults).toHaveLength(2);
    expect(tiktokResults[0].hashtag).toBe('#tiktok1'); // Highest TikTok score: 95
    expect(tiktokResults[1].hashtag).toBe('#tiktok2'); // Second highest: 90
    expect(tiktokResults.every(t => t.platform === 'tiktok')).toBe(true);

    // Filter by Instagram with limit 1
    const instagramResults = await getTrends('instagram', 1);
    expect(instagramResults).toHaveLength(1);
    expect(instagramResults[0].hashtag).toBe('#insta1'); // Highest Instagram score: 88
    expect(instagramResults[0].platform).toBe('instagram');
  });

  it('should handle trends with same trending_score ordered by recency', async () => {
    // Create trends with same trending score but different times
    const baseTrend = createTrendData({
      trending_score: 85.0,
      platform: 'tiktok'
    });

    // Insert first trend (will have earlier timestamp)
    await db.insert(trendsTable).values({
      ...baseTrend,
      hashtag: '#older',
      engagement_rate: baseTrend.engagement_rate.toString(),
      sentiment_score: baseTrend.sentiment_score.toString(),
      trending_score: baseTrend.trending_score.toString()
    }).execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert second trend (will have later timestamp)
    await db.insert(trendsTable).values({
      ...baseTrend,
      hashtag: '#newer',
      engagement_rate: baseTrend.engagement_rate.toString(),
      sentiment_score: baseTrend.sentiment_score.toString(),
      trending_score: baseTrend.trending_score.toString()
    }).execute();

    const result = await getTrends();

    expect(result).toHaveLength(2);
    // With same trending_score, newer should come first (detected_at DESC)
    expect(result[0].hashtag).toBe('#newer');
    expect(result[1].hashtag).toBe('#older');
  });

  it('should return all required fields with correct types', async () => {
    const trendData = createTrendData({
      hashtag: '#testtype',
      keyword: 'test keyword',
      volume: 5000,
      engagement_rate: 75.25,
      sentiment_score: -0.5,
      trending_score: 88.75
    });

    await db.insert(trendsTable).values({
      ...trendData,
      engagement_rate: trendData.engagement_rate.toString(),
      sentiment_score: trendData.sentiment_score.toString(),
      trending_score: trendData.trending_score.toString()
    }).execute();

    const result = await getTrends();

    expect(result).toHaveLength(1);
    const trend = result[0];

    // Check all required fields exist
    expect(trend.id).toBeDefined();
    expect(trend.platform).toBe('tiktok');
    expect(trend.hashtag).toBe('#testtype');
    expect(trend.keyword).toBe('test keyword');
    expect(trend.volume).toBe(5000);
    expect(trend.detected_at).toBeInstanceOf(Date);
    expect(trend.created_at).toBeInstanceOf(Date);

    // Check numeric fields have correct types and values
    expect(typeof trend.engagement_rate).toBe('number');
    expect(typeof trend.sentiment_score).toBe('number');
    expect(typeof trend.trending_score).toBe('number');
    
    expect(trend.engagement_rate).toBe(75.25);
    expect(trend.sentiment_score).toBe(-0.5);
    expect(trend.trending_score).toBe(88.75);
  });
});