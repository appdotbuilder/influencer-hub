import { z } from 'zod';

// Enum definitions for various platform and status types
export const socialPlatformSchema = z.enum(['tiktok', 'instagram', 'x', 'facebook', 'onlyfans']);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

export const contentTypeSchema = z.enum(['post', 'story', 'reel', 'video', 'image']);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const postStatusSchema = z.enum(['draft', 'scheduled', 'published', 'failed']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const campaignStatusSchema = z.enum(['planning', 'active', 'completed', 'paused']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const workflowStatusSchema = z.enum(['pending', 'approved', 'rejected', 'completed']);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const priorityLevelSchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type PriorityLevel = z.infer<typeof priorityLevelSchema>;

// User/Influencer schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  full_name: z.string().min(1).max(100),
  bio: z.string().nullable().optional(),
  profile_image_url: z.string().url().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Social Platform Account schema
export const platformAccountSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  platform: socialPlatformSchema,
  platform_user_id: z.string(),
  username: z.string(),
  access_token: z.string().nullable(),
  refresh_token: z.string().nullable(),
  token_expires_at: z.coerce.date().nullable(),
  is_active: z.boolean(),
  followers_count: z.number().int(),
  following_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PlatformAccount = z.infer<typeof platformAccountSchema>;

export const createPlatformAccountInputSchema = z.object({
  user_id: z.number(),
  platform: socialPlatformSchema,
  platform_user_id: z.string(),
  username: z.string(),
  access_token: z.string().nullable().optional(),
  refresh_token: z.string().nullable().optional(),
  token_expires_at: z.coerce.date().nullable().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  following_count: z.number().int().nonnegative().optional()
});

export type CreatePlatformAccountInput = z.infer<typeof createPlatformAccountInputSchema>;

// Trend Monitoring schema
export const trendSchema = z.object({
  id: z.number(),
  platform: socialPlatformSchema,
  hashtag: z.string(),
  keyword: z.string().nullable(),
  volume: z.number().int(),
  engagement_rate: z.number(),
  sentiment_score: z.number(),
  trending_score: z.number(),
  detected_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Trend = z.infer<typeof trendSchema>;

export const createTrendInputSchema = z.object({
  platform: socialPlatformSchema,
  hashtag: z.string(),
  keyword: z.string().nullable().optional(),
  volume: z.number().int().nonnegative(),
  engagement_rate: z.number().min(0).max(100),
  sentiment_score: z.number().min(-1).max(1),
  trending_score: z.number().min(0).max(100)
});

export type CreateTrendInput = z.infer<typeof createTrendInputSchema>;

// Content schema
export const contentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content_type: contentTypeSchema,
  ai_generated: z.boolean(),
  script: z.string().nullable(),
  media_urls: z.array(z.string()),
  hashtags: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Content = z.infer<typeof contentSchema>;

export const createContentInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  content_type: contentTypeSchema,
  ai_generated: z.boolean().optional(),
  script: z.string().nullable().optional(),
  media_urls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string()).optional()
});

export type CreateContentInput = z.infer<typeof createContentInputSchema>;

// Scheduled Posts schema
export const scheduledPostSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  content_id: z.number(),
  platform_account_id: z.number(),
  scheduled_at: z.coerce.date(),
  status: postStatusSchema,
  platform_post_id: z.string().nullable(),
  error_message: z.string().nullable(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ScheduledPost = z.infer<typeof scheduledPostSchema>;

export const createScheduledPostInputSchema = z.object({
  user_id: z.number(),
  content_id: z.number(),
  platform_account_id: z.number(),
  scheduled_at: z.coerce.date()
});

export type CreateScheduledPostInput = z.infer<typeof createScheduledPostInputSchema>;

// Campaign schema
export const campaignSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  budget: z.number().nullable(),
  target_platforms: z.array(socialPlatformSchema),
  goals: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Campaign = z.infer<typeof campaignSchema>;

export const createCampaignInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
  target_platforms: z.array(socialPlatformSchema),
  goals: z.string().nullable().optional()
});

export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

// Campaign Metrics schema
export const campaignMetricSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  platform: socialPlatformSchema,
  metric_name: z.string(),
  metric_value: z.number(),
  measured_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type CampaignMetric = z.infer<typeof campaignMetricSchema>;

export const createCampaignMetricInputSchema = z.object({
  campaign_id: z.number(),
  platform: socialPlatformSchema,
  metric_name: z.string(),
  metric_value: z.number(),
  measured_at: z.coerce.date().optional()
});

export type CreateCampaignMetricInput = z.infer<typeof createCampaignMetricInputSchema>;

// Workflow/Task Management schema
export const workflowTaskSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  campaign_id: z.number().nullable(),
  content_id: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: workflowStatusSchema,
  priority: priorityLevelSchema,
  assigned_to: z.number().nullable(),
  due_date: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type WorkflowTask = z.infer<typeof workflowTaskSchema>;

export const createWorkflowTaskInputSchema = z.object({
  user_id: z.number(),
  campaign_id: z.number().nullable().optional(),
  content_id: z.number().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  priority: priorityLevelSchema,
  assigned_to: z.number().nullable().optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type CreateWorkflowTaskInput = z.infer<typeof createWorkflowTaskInputSchema>;

// AI Content Generation Request schema
export const aiContentRequestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  prompt: z.string(),
  content_type: contentTypeSchema,
  platform: socialPlatformSchema,
  generated_content: z.string().nullable(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  error_message: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AIContentRequest = z.infer<typeof aiContentRequestSchema>;

export const createAIContentRequestInputSchema = z.object({
  user_id: z.number(),
  prompt: z.string().min(10).max(1000),
  content_type: contentTypeSchema,
  platform: socialPlatformSchema
});

export type CreateAIContentRequestInput = z.infer<typeof createAIContentRequestInputSchema>;