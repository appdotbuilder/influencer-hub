import { db } from '../db';
import { trendsTable } from '../db/schema';
import { type CreateTrendInput, type Trend } from '../schema';

export const createTrend = async (input: CreateTrendInput): Promise<Trend> => {
  try {
    // Insert trend record
    const result = await db.insert(trendsTable)
      .values({
        platform: input.platform,
        hashtag: input.hashtag,
        keyword: input.keyword || null,
        volume: input.volume,
        engagement_rate: input.engagement_rate.toString(), // Convert number to string for numeric column
        sentiment_score: input.sentiment_score.toString(), // Convert number to string for numeric column
        trending_score: input.trending_score.toString(), // Convert number to string for numeric column
        detected_at: new Date() // Set detection time to now
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const trend = result[0];
    return {
      ...trend,
      engagement_rate: parseFloat(trend.engagement_rate), // Convert string back to number
      sentiment_score: parseFloat(trend.sentiment_score), // Convert string back to number
      trending_score: parseFloat(trend.trending_score) // Convert string back to number
    };
  } catch (error) {
    console.error('Trend creation failed:', error);
    throw error;
  }
};