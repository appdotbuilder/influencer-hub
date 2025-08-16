import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  createPlatformAccountInputSchema,
  createTrendInputSchema,
  createContentInputSchema,
  createScheduledPostInputSchema,
  createCampaignInputSchema,
  createCampaignMetricInputSchema,
  createWorkflowTaskInputSchema,
  createAIContentRequestInputSchema,
  socialPlatformSchema,
  postStatusSchema,
  campaignStatusSchema,
  workflowStatusSchema,
  priorityLevelSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createPlatformAccount } from './handlers/create_platform_account';
import { getPlatformAccountsByUser } from './handlers/get_platform_accounts';
import { createTrend } from './handlers/create_trend';
import { getTrends } from './handlers/get_trends';
import { createContent } from './handlers/create_content';
import { getContentByUser } from './handlers/get_content';
import { createScheduledPost } from './handlers/create_scheduled_post';
import { getScheduledPostsByUser } from './handlers/get_scheduled_posts';
import { createCampaign } from './handlers/create_campaign';
import { getCampaignsByUser } from './handlers/get_campaigns';
import { createCampaignMetric } from './handlers/create_campaign_metric';
import { getCampaignMetrics } from './handlers/get_campaign_metrics';
import { createWorkflowTask } from './handlers/create_workflow_task';
import { getWorkflowTasksByUser } from './handlers/get_workflow_tasks';
import { updateWorkflowTaskStatus } from './handlers/update_workflow_task';
import { createAIContentRequest } from './handlers/create_ai_content_request';
import { getAIContentRequestsByUser } from './handlers/get_ai_content_requests';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Platform account management
  createPlatformAccount: publicProcedure
    .input(createPlatformAccountInputSchema)
    .mutation(({ input }) => createPlatformAccount(input)),

  getPlatformAccountsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getPlatformAccountsByUser(input.userId)),

  // Trend monitoring
  createTrend: publicProcedure
    .input(createTrendInputSchema)
    .mutation(({ input }) => createTrend(input)),

  getTrends: publicProcedure
    .input(z.object({
      platform: socialPlatformSchema.optional(),
      limit: z.number().int().min(1).max(100).optional()
    }))
    .query(({ input }) => getTrends(input.platform, input.limit)),

  // Content management
  createContent: publicProcedure
    .input(createContentInputSchema)
    .mutation(({ input }) => createContent(input)),

  getContentByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getContentByUser(input.userId)),

  // Scheduled posting
  createScheduledPost: publicProcedure
    .input(createScheduledPostInputSchema)
    .mutation(({ input }) => createScheduledPost(input)),

  getScheduledPostsByUser: publicProcedure
    .input(z.object({
      userId: z.number(),
      status: postStatusSchema.optional()
    }))
    .query(({ input }) => getScheduledPostsByUser(input.userId, input.status)),

  // Campaign management
  createCampaign: publicProcedure
    .input(createCampaignInputSchema)
    .mutation(({ input }) => createCampaign(input)),

  getCampaignsByUser: publicProcedure
    .input(z.object({
      userId: z.number(),
      status: campaignStatusSchema.optional()
    }))
    .query(({ input }) => getCampaignsByUser(input.userId, input.status)),

  // Campaign metrics
  createCampaignMetric: publicProcedure
    .input(createCampaignMetricInputSchema)
    .mutation(({ input }) => createCampaignMetric(input)),

  getCampaignMetrics: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      platform: socialPlatformSchema.optional(),
      metricName: z.string().optional()
    }))
    .query(({ input }) => getCampaignMetrics(input.campaignId, input.platform, input.metricName)),

  // Workflow management
  createWorkflowTask: publicProcedure
    .input(createWorkflowTaskInputSchema)
    .mutation(({ input }) => createWorkflowTask(input)),

  getWorkflowTasksByUser: publicProcedure
    .input(z.object({
      userId: z.number(),
      status: workflowStatusSchema.optional(),
      priority: priorityLevelSchema.optional(),
      assignedToMe: z.boolean().optional()
    }))
    .query(({ input }) => getWorkflowTasksByUser(input.userId, input.status, input.priority, input.assignedToMe)),

  updateWorkflowTaskStatus: publicProcedure
    .input(z.object({
      taskId: z.number(),
      status: workflowStatusSchema
    }))
    .mutation(({ input }) => updateWorkflowTaskStatus(input.taskId, input.status)),

  // AI content generation
  createAIContentRequest: publicProcedure
    .input(createAIContentRequestInputSchema)
    .mutation(({ input }) => createAIContentRequest(input)),

  getAIContentRequestsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getAIContentRequestsByUser(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Influencer Portal server listening at port: ${port}`);
}

start();