import { db } from '../db';
import { trendsTable } from '../db/schema';
import { type Trend, type SocialPlatform } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTrends = async (platform?: SocialPlatform, limit: number = 50): Promise<Trend[]> => {
  try {
    // Build query with conditional platform filter
    const results = platform 
      ? await db.select()
          .from(trendsTable)
          .where(eq(trendsTable.platform, platform))
          .orderBy(desc(trendsTable.trending_score), desc(trendsTable.detected_at))
          .limit(limit)
          .execute()
      : await db.select()
          .from(trendsTable)
          .orderBy(desc(trendsTable.trending_score), desc(trendsTable.detected_at))
          .limit(limit)
          .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(trend => ({
      ...trend,
      engagement_rate: parseFloat(trend.engagement_rate),
      sentiment_score: parseFloat(trend.sentiment_score),
      trending_score: parseFloat(trend.trending_score)
    }));
  } catch (error) {
    console.error('Trend retrieval failed:', error);
    throw error;
  }
};