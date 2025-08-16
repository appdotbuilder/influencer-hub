import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, campaignsTable, campaignMetricsTable } from '../db/schema';
import { type CreateUserInput, type CreateCampaignInput, type CreateCampaignMetricInput } from '../schema';
import { getCampaignMetrics } from '../handlers/get_campaign_metrics';

// Test data
const testUser: CreateUserInput = {
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    bio: 'Test bio',
    profile_image_url: 'https://example.com/profile.jpg'
};

const testCampaign: CreateCampaignInput = {
    user_id: 1, // Will be set after user creation
    name: 'Test Campaign',
    description: 'A test campaign',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31'),
    budget: 1000.00,
    target_platforms: ['instagram', 'tiktok'],
    goals: 'Increase engagement'
};

describe('getCampaignMetrics', () => {
    let userId: number;
    let campaignId: number;

    beforeEach(async () => {
        await createDB();

        // Create user
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
        
        userId = userResult[0].id;

        // Create campaign
        const campaignResult = await db.insert(campaignsTable)
            .values({
                user_id: userId,
                name: testCampaign.name,
                description: testCampaign.description,
                start_date: testCampaign.start_date,
                end_date: testCampaign.end_date,
                budget: testCampaign.budget?.toString(),
                target_platforms: testCampaign.target_platforms,
                goals: testCampaign.goals
            })
            .returning()
            .execute();

        campaignId = campaignResult[0].id;
    });

    afterEach(resetDB);

    it('should return empty array when no metrics exist', async () => {
        const result = await getCampaignMetrics(campaignId);

        expect(result).toEqual([]);
    });

    it('should return all metrics for a campaign', async () => {
        // Create test metrics
        const metrics: CreateCampaignMetricInput[] = [
            {
                campaign_id: campaignId,
                platform: 'instagram',
                metric_name: 'impressions',
                metric_value: 1000,
                measured_at: new Date('2024-01-15T10:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'tiktok',
                metric_name: 'likes',
                metric_value: 250,
                measured_at: new Date('2024-01-15T11:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'instagram',
                metric_name: 'engagement_rate',
                metric_value: 5.25,
                measured_at: new Date('2024-01-15T12:00:00Z')
            }
        ];

        await db.insert(campaignMetricsTable)
            .values(metrics.map(metric => ({
                ...metric,
                metric_value: metric.metric_value.toString()
            })))
            .execute();

        const result = await getCampaignMetrics(campaignId);

        expect(result).toHaveLength(3);
        
        // Should be ordered by measured_at descending (most recent first)
        expect(result[0].metric_name).toEqual('engagement_rate');
        expect(result[1].metric_name).toEqual('likes');
        expect(result[2].metric_name).toEqual('impressions');

        // Check numeric conversion
        expect(typeof result[0].metric_value).toEqual('number');
        expect(result[0].metric_value).toEqual(5.25);
        expect(result[1].metric_value).toEqual(250);
        expect(result[2].metric_value).toEqual(1000);

        // Verify all fields are present
        result.forEach(metric => {
            expect(metric.id).toBeDefined();
            expect(metric.campaign_id).toEqual(campaignId);
            expect(metric.platform).toBeDefined();
            expect(metric.metric_name).toBeDefined();
            expect(metric.measured_at).toBeInstanceOf(Date);
            expect(metric.created_at).toBeInstanceOf(Date);
        });
    });

    it('should filter metrics by platform', async () => {
        // Create metrics for different platforms
        const metrics = [
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'impressions',
                metric_value: '1000',
                measured_at: new Date('2024-01-15T10:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'tiktok' as const,
                metric_name: 'views',
                metric_value: '2000',
                measured_at: new Date('2024-01-15T11:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'likes',
                metric_value: '150',
                measured_at: new Date('2024-01-15T12:00:00Z')
            }
        ];

        await db.insert(campaignMetricsTable)
            .values(metrics)
            .execute();

        const result = await getCampaignMetrics(campaignId, 'instagram');

        expect(result).toHaveLength(2);
        result.forEach(metric => {
            expect(metric.platform).toEqual('instagram');
        });

        // Check they're ordered correctly
        expect(result[0].metric_name).toEqual('likes'); // More recent
        expect(result[1].metric_name).toEqual('impressions');
    });

    it('should filter metrics by metric name', async () => {
        // Create metrics with different names
        const metrics = [
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'impressions',
                metric_value: '1000',
                measured_at: new Date('2024-01-15T10:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'tiktok' as const,
                metric_name: 'impressions',
                metric_value: '800',
                measured_at: new Date('2024-01-15T11:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'likes',
                metric_value: '150',
                measured_at: new Date('2024-01-15T12:00:00Z')
            }
        ];

        await db.insert(campaignMetricsTable)
            .values(metrics)
            .execute();

        const result = await getCampaignMetrics(campaignId, undefined, 'impressions');

        expect(result).toHaveLength(2);
        result.forEach(metric => {
            expect(metric.metric_name).toEqual('impressions');
        });

        // Check platforms are different but metric name is same
        const platforms = result.map(m => m.platform).sort();
        expect(platforms).toEqual(['instagram', 'tiktok']);
    });

    it('should filter by both platform and metric name', async () => {
        // Create diverse metrics
        const metrics = [
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'impressions',
                metric_value: '1000',
                measured_at: new Date('2024-01-15T10:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'tiktok' as const,
                metric_name: 'impressions',
                metric_value: '800',
                measured_at: new Date('2024-01-15T11:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'likes',
                metric_value: '150',
                measured_at: new Date('2024-01-15T12:00:00Z')
            },
            {
                campaign_id: campaignId,
                platform: 'instagram' as const,
                metric_name: 'impressions',
                metric_value: '1200',
                measured_at: new Date('2024-01-15T13:00:00Z')
            }
        ];

        await db.insert(campaignMetricsTable)
            .values(metrics)
            .execute();

        const result = await getCampaignMetrics(campaignId, 'instagram', 'impressions');

        expect(result).toHaveLength(2);
        result.forEach(metric => {
            expect(metric.platform).toEqual('instagram');
            expect(metric.metric_name).toEqual('impressions');
        });

        // Should be ordered by time (most recent first)
        expect(result[0].metric_value).toEqual(1200);
        expect(result[1].metric_value).toEqual(1000);
    });

    it('should return empty array for non-existent campaign', async () => {
        const nonExistentCampaignId = 99999;
        const result = await getCampaignMetrics(nonExistentCampaignId);

        expect(result).toEqual([]);
    });

    it('should return empty array when filters match no metrics', async () => {
        // Create a metric that won't match the filters
        await db.insert(campaignMetricsTable)
            .values({
                campaign_id: campaignId,
                platform: 'instagram',
                metric_name: 'impressions',
                metric_value: '1000',
                measured_at: new Date('2024-01-15T10:00:00Z')
            })
            .execute();

        // Search for different platform
        const result1 = await getCampaignMetrics(campaignId, 'facebook');
        expect(result1).toEqual([]);

        // Search for different metric name
        const result2 = await getCampaignMetrics(campaignId, undefined, 'clicks');
        expect(result2).toEqual([]);

        // Search for both different
        const result3 = await getCampaignMetrics(campaignId, 'facebook', 'clicks');
        expect(result3).toEqual([]);
    });

    it('should handle decimal values correctly', async () => {
        // Create metric with decimal value
        await db.insert(campaignMetricsTable)
            .values({
                campaign_id: campaignId,
                platform: 'instagram',
                metric_name: 'engagement_rate',
                metric_value: '3.1416',
                measured_at: new Date('2024-01-15T10:00:00Z')
            })
            .execute();

        const result = await getCampaignMetrics(campaignId);

        expect(result).toHaveLength(1);
        expect(typeof result[0].metric_value).toEqual('number');
        expect(result[0].metric_value).toEqual(3.1416);
    });
});