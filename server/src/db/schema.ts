import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  pgEnum, 
  jsonb 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define PostgreSQL enums
export const socialPlatformEnum = pgEnum('social_platform', ['tiktok', 'instagram', 'x', 'facebook', 'onlyfans']);
export const contentTypeEnum = pgEnum('content_type', ['post', 'story', 'reel', 'video', 'image']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'scheduled', 'published', 'failed']);
export const campaignStatusEnum = pgEnum('campaign_status', ['planning', 'active', 'completed', 'paused']);
export const workflowStatusEnum = pgEnum('workflow_status', ['pending', 'approved', 'rejected', 'completed']);
export const priorityLevelEnum = pgEnum('priority_level', ['low', 'medium', 'high', 'urgent']);
export const aiRequestStatusEnum = pgEnum('ai_request_status', ['pending', 'generating', 'completed', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  full_name: text('full_name').notNull(),
  bio: text('bio'),
  profile_image_url: text('profile_image_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Platform accounts table
export const platformAccountsTable = pgTable('platform_accounts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  platform: socialPlatformEnum('platform').notNull(),
  platform_user_id: text('platform_user_id').notNull(),
  username: text('username').notNull(),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  token_expires_at: timestamp('token_expires_at'),
  is_active: boolean('is_active').default(true).notNull(),
  followers_count: integer('followers_count').default(0).notNull(),
  following_count: integer('following_count').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Trends table
export const trendsTable = pgTable('trends', {
  id: serial('id').primaryKey(),
  platform: socialPlatformEnum('platform').notNull(),
  hashtag: text('hashtag').notNull(),
  keyword: text('keyword'),
  volume: integer('volume').notNull(),
  engagement_rate: numeric('engagement_rate', { precision: 5, scale: 2 }).notNull(),
  sentiment_score: numeric('sentiment_score', { precision: 3, scale: 2 }).notNull(),
  trending_score: numeric('trending_score', { precision: 5, scale: 2 }).notNull(),
  detected_at: timestamp('detected_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Content table
export const contentTable = pgTable('content', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  content_type: contentTypeEnum('content_type').notNull(),
  ai_generated: boolean('ai_generated').default(false).notNull(),
  script: text('script'),
  media_urls: jsonb('media_urls').default([]).notNull(), // Array of URLs
  hashtags: jsonb('hashtags').default([]).notNull(), // Array of hashtags
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Scheduled posts table
export const scheduledPostsTable = pgTable('scheduled_posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  content_id: integer('content_id').references(() => contentTable.id).notNull(),
  platform_account_id: integer('platform_account_id').references(() => platformAccountsTable.id).notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  status: postStatusEnum('status').default('draft').notNull(),
  platform_post_id: text('platform_post_id'),
  error_message: text('error_message'),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Campaigns table
export const campaignsTable = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: campaignStatusEnum('status').default('planning').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  budget: numeric('budget', { precision: 10, scale: 2 }),
  target_platforms: jsonb('target_platforms').notNull(), // Array of platforms
  goals: text('goals'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Campaign metrics table
export const campaignMetricsTable = pgTable('campaign_metrics', {
  id: serial('id').primaryKey(),
  campaign_id: integer('campaign_id').references(() => campaignsTable.id).notNull(),
  platform: socialPlatformEnum('platform').notNull(),
  metric_name: text('metric_name').notNull(),
  metric_value: numeric('metric_value', { precision: 15, scale: 4 }).notNull(),
  measured_at: timestamp('measured_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Workflow tasks table
export const workflowTasksTable = pgTable('workflow_tasks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  campaign_id: integer('campaign_id').references(() => campaignsTable.id),
  content_id: integer('content_id').references(() => contentTable.id),
  title: text('title').notNull(),
  description: text('description'),
  status: workflowStatusEnum('status').default('pending').notNull(),
  priority: priorityLevelEnum('priority').default('medium').notNull(),
  assigned_to: integer('assigned_to').references(() => usersTable.id),
  due_date: timestamp('due_date'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// AI content requests table
export const aiContentRequestsTable = pgTable('ai_content_requests', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  prompt: text('prompt').notNull(),
  content_type: contentTypeEnum('content_type').notNull(),
  platform: socialPlatformEnum('platform').notNull(),
  generated_content: text('generated_content'),
  status: aiRequestStatusEnum('status').default('pending').notNull(),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  platformAccounts: many(platformAccountsTable),
  content: many(contentTable),
  scheduledPosts: many(scheduledPostsTable),
  campaigns: many(campaignsTable),
  workflowTasks: many(workflowTasksTable),
  assignedTasks: many(workflowTasksTable, { relationName: 'assignedTasks' }),
  aiContentRequests: many(aiContentRequestsTable),
}));

export const platformAccountsRelations = relations(platformAccountsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [platformAccountsTable.user_id],
    references: [usersTable.id],
  }),
  scheduledPosts: many(scheduledPostsTable),
}));

export const contentRelations = relations(contentTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [contentTable.user_id],
    references: [usersTable.id],
  }),
  scheduledPosts: many(scheduledPostsTable),
  workflowTasks: many(workflowTasksTable),
}));

export const scheduledPostsRelations = relations(scheduledPostsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [scheduledPostsTable.user_id],
    references: [usersTable.id],
  }),
  content: one(contentTable, {
    fields: [scheduledPostsTable.content_id],
    references: [contentTable.id],
  }),
  platformAccount: one(platformAccountsTable, {
    fields: [scheduledPostsTable.platform_account_id],
    references: [platformAccountsTable.id],
  }),
}));

export const campaignsRelations = relations(campaignsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [campaignsTable.user_id],
    references: [usersTable.id],
  }),
  metrics: many(campaignMetricsTable),
  workflowTasks: many(workflowTasksTable),
}));

export const campaignMetricsRelations = relations(campaignMetricsTable, ({ one }) => ({
  campaign: one(campaignsTable, {
    fields: [campaignMetricsTable.campaign_id],
    references: [campaignsTable.id],
  }),
}));

export const workflowTasksRelations = relations(workflowTasksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [workflowTasksTable.user_id],
    references: [usersTable.id],
  }),
  assignedUser: one(usersTable, {
    fields: [workflowTasksTable.assigned_to],
    references: [usersTable.id],
    relationName: 'assignedTasks',
  }),
  campaign: one(campaignsTable, {
    fields: [workflowTasksTable.campaign_id],
    references: [campaignsTable.id],
  }),
  content: one(contentTable, {
    fields: [workflowTasksTable.content_id],
    references: [contentTable.id],
  }),
}));

export const aiContentRequestsRelations = relations(aiContentRequestsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [aiContentRequestsTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for query building
export const tables = {
  users: usersTable,
  platformAccounts: platformAccountsTable,
  trends: trendsTable,
  content: contentTable,
  scheduledPosts: scheduledPostsTable,
  campaigns: campaignsTable,
  campaignMetrics: campaignMetricsTable,
  workflowTasks: workflowTasksTable,
  aiContentRequests: aiContentRequestsTable,
};

// TypeScript types for database operations
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type PlatformAccount = typeof platformAccountsTable.$inferSelect;
export type NewPlatformAccount = typeof platformAccountsTable.$inferInsert;

export type Trend = typeof trendsTable.$inferSelect;
export type NewTrend = typeof trendsTable.$inferInsert;

export type Content = typeof contentTable.$inferSelect;
export type NewContent = typeof contentTable.$inferInsert;

export type ScheduledPost = typeof scheduledPostsTable.$inferSelect;
export type NewScheduledPost = typeof scheduledPostsTable.$inferInsert;

export type Campaign = typeof campaignsTable.$inferSelect;
export type NewCampaign = typeof campaignsTable.$inferInsert;

export type CampaignMetric = typeof campaignMetricsTable.$inferSelect;
export type NewCampaignMetric = typeof campaignMetricsTable.$inferInsert;

export type WorkflowTask = typeof workflowTasksTable.$inferSelect;
export type NewWorkflowTask = typeof workflowTasksTable.$inferInsert;

export type AIContentRequest = typeof aiContentRequestsTable.$inferSelect;
export type NewAIContentRequest = typeof aiContentRequestsTable.$inferInsert;