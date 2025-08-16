import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { workflowTasksTable, usersTable, campaignsTable, contentTable } from '../db/schema';
import { type CreateWorkflowTaskInput } from '../schema';
import { createWorkflowTask } from '../handlers/create_workflow_task';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'taskowner@test.com',
  username: 'taskowner',
  full_name: 'Task Owner'
};

const assignedUser = {
  email: 'assigned@test.com',
  username: 'assigneduser',
  full_name: 'Assigned User'
};

// Test campaign data
const testCampaign = {
  user_id: 0, // Will be set after user creation
  name: 'Test Campaign',
  start_date: new Date(),
  target_platforms: ['instagram', 'tiktok']
};

// Test content data
const testContent = {
  user_id: 0, // Will be set after user creation
  title: 'Test Content',
  content_type: 'post' as const
};

describe('createWorkflowTask', () => {
  let userId: number;
  let assignedUserId: number;
  let campaignId: number;
  let contentId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create assigned user
    const assignedUserResult = await db.insert(usersTable)
      .values(assignedUser)
      .returning()
      .execute();
    assignedUserId = assignedUserResult[0].id;

    // Create test campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        ...testCampaign,
        user_id: userId
      })
      .returning()
      .execute();
    campaignId = campaignResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId
      })
      .returning()
      .execute();
    contentId = contentResult[0].id;
  });

  afterEach(resetDB);

  it('should create a basic workflow task', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      title: 'Review Content',
      priority: 'medium'
    };

    const result = await createWorkflowTask(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('Review Content');
    expect(result.priority).toEqual('medium');
    expect(result.status).toEqual('pending');
    expect(result.campaign_id).toBeNull();
    expect(result.content_id).toBeNull();
    expect(result.assigned_to).toBeNull();
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create workflow task with all optional fields', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      campaign_id: campaignId,
      content_id: contentId,
      title: 'Comprehensive Review Task',
      description: 'Review all aspects of the content for campaign approval',
      priority: 'high',
      assigned_to: assignedUserId,
      due_date: dueDate
    };

    const result = await createWorkflowTask(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.campaign_id).toEqual(campaignId);
    expect(result.content_id).toEqual(contentId);
    expect(result.title).toEqual('Comprehensive Review Task');
    expect(result.description).toEqual('Review all aspects of the content for campaign approval');
    expect(result.priority).toEqual('high');
    expect(result.assigned_to).toEqual(assignedUserId);
    expect(result.due_date).toEqual(dueDate);
    expect(result.status).toEqual('pending');
    expect(result.completed_at).toBeNull();
  });

  it('should save workflow task to database', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      title: 'Database Test Task',
      priority: 'low',
      description: 'Testing database persistence'
    };

    const result = await createWorkflowTask(input);

    const tasks = await db.select()
      .from(workflowTasksTable)
      .where(eq(workflowTasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Test Task');
    expect(tasks[0].priority).toEqual('low');
    expect(tasks[0].description).toEqual('Testing database persistence');
    expect(tasks[0].user_id).toEqual(userId);
    expect(tasks[0].status).toEqual('pending');
  });

  it('should create task with campaign reference only', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      campaign_id: campaignId,
      title: 'Campaign Review',
      priority: 'urgent'
    };

    const result = await createWorkflowTask(input);

    expect(result.campaign_id).toEqual(campaignId);
    expect(result.content_id).toBeNull();
    expect(result.title).toEqual('Campaign Review');
    expect(result.priority).toEqual('urgent');
  });

  it('should create task with content reference only', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      content_id: contentId,
      title: 'Content Approval',
      priority: 'high'
    };

    const result = await createWorkflowTask(input);

    expect(result.content_id).toEqual(contentId);
    expect(result.campaign_id).toBeNull();
    expect(result.title).toEqual('Content Approval');
    expect(result.priority).toEqual('high');
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: 99999,
      title: 'Invalid User Task',
      priority: 'medium'
    };

    expect(createWorkflowTask(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error for non-existent assigned user', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      title: 'Invalid Assignment',
      priority: 'medium',
      assigned_to: 99999
    };

    expect(createWorkflowTask(input)).rejects.toThrow(/Assigned user with id 99999 not found/i);
  });

  it('should throw error for non-existent campaign', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      campaign_id: 99999,
      title: 'Invalid Campaign Task',
      priority: 'medium'
    };

    expect(createWorkflowTask(input)).rejects.toThrow(/Campaign with id 99999 not found/i);
  });

  it('should throw error for non-existent content', async () => {
    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      content_id: 99999,
      title: 'Invalid Content Task',
      priority: 'medium'
    };

    expect(createWorkflowTask(input)).rejects.toThrow(/Content with id 99999 not found/i);
  });

  it('should handle all priority levels correctly', async () => {
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    
    for (const priority of priorities) {
      const input: CreateWorkflowTaskInput = {
        user_id: userId,
        title: `${priority} priority task`,
        priority: priority
      };

      const result = await createWorkflowTask(input);
      expect(result.priority).toEqual(priority);
    }
  });

  it('should create task with future due date', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // Due in 1 month

    const input: CreateWorkflowTaskInput = {
      user_id: userId,
      title: 'Future Due Date Task',
      priority: 'medium',
      due_date: futureDate
    };

    const result = await createWorkflowTask(input);

    expect(result.due_date).toEqual(futureDate);
    expect(result.due_date!.getTime()).toBeGreaterThan(new Date().getTime());
  });
});