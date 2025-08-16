import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowTasksTable, campaignsTable, contentTable } from '../db/schema';
import { type WorkflowStatus } from '../schema';
import { updateWorkflowTaskStatus } from '../handlers/update_workflow_task';
import { eq } from 'drizzle-orm';

describe('updateWorkflowTaskStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCampaignId: number;
  let testContentId: number;
  let testTaskId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        user_id: testUserId,
        name: 'Test Campaign',
        start_date: new Date(),
        target_platforms: ['tiktok', 'instagram']
      })
      .returning()
      .execute();
    testCampaignId = campaignResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: testUserId,
        title: 'Test Content',
        content_type: 'post'
      })
      .returning()
      .execute();
    testContentId = contentResult[0].id;

    // Create test workflow task
    const taskResult = await db.insert(workflowTasksTable)
      .values({
        user_id: testUserId,
        campaign_id: testCampaignId,
        content_id: testContentId,
        title: 'Test Task',
        description: 'Test task description',
        status: 'pending',
        priority: 'medium'
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;
  });

  it('should update task status successfully', async () => {
    const result = await updateWorkflowTaskStatus(testTaskId, 'approved');

    expect(result.id).toEqual(testTaskId);
    expect(result.status).toEqual('approved');
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('Test task description');
    expect(result.user_id).toEqual(testUserId);
    expect(result.campaign_id).toEqual(testCampaignId);
    expect(result.content_id).toEqual(testContentId);
    expect(result.priority).toEqual('medium');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should set completed_at when status is completed', async () => {
    const result = await updateWorkflowTaskStatus(testTaskId, 'completed');

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
  });

  it('should clear completed_at when status is not completed', async () => {
    // First set task to completed
    await updateWorkflowTaskStatus(testTaskId, 'completed');

    // Then change to a non-completed status
    const result = await updateWorkflowTaskStatus(testTaskId, 'rejected');

    expect(result.status).toEqual('rejected');
    expect(result.completed_at).toBeNull();
  });

  it('should save updated status to database', async () => {
    await updateWorkflowTaskStatus(testTaskId, 'approved');

    const tasks = await db.select()
      .from(workflowTasksTable)
      .where(eq(workflowTasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toEqual('approved');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update all workflow statuses correctly', async () => {
    const statuses: WorkflowStatus[] = ['pending', 'approved', 'rejected', 'completed'];

    for (const status of statuses) {
      const result = await updateWorkflowTaskStatus(testTaskId, status);
      expect(result.status).toEqual(status);
      
      if (status === 'completed') {
        expect(result.completed_at).toBeInstanceOf(Date);
      } else {
        expect(result.completed_at).toBeNull();
      }
    }
  });

  it('should throw error when task does not exist', async () => {
    const nonExistentTaskId = 99999;

    await expect(
      updateWorkflowTaskStatus(nonExistentTaskId, 'approved')
    ).rejects.toThrow(/Workflow task with id 99999 not found/i);
  });

  it('should handle task without campaign or content', async () => {
    // Create task without campaign and content references
    const taskResult = await db.insert(workflowTasksTable)
      .values({
        user_id: testUserId,
        title: 'Standalone Task',
        status: 'pending',
        priority: 'high'
      })
      .returning()
      .execute();

    const result = await updateWorkflowTaskStatus(taskResult[0].id, 'completed');

    expect(result.status).toEqual('completed');
    expect(result.campaign_id).toBeNull();
    expect(result.content_id).toBeNull();
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should preserve all other task fields when updating status', async () => {
    // Create task with assigned user
    const assigneeResult = await db.insert(usersTable)
      .values({
        email: 'assignee@example.com',
        username: 'assignee',
        full_name: 'Task Assignee'
      })
      .returning()
      .execute();

    const dueDate = new Date('2024-12-31');
    const taskWithAllFieldsResult = await db.insert(workflowTasksTable)
      .values({
        user_id: testUserId,
        campaign_id: testCampaignId,
        content_id: testContentId,
        title: 'Complex Task',
        description: 'Task with all fields',
        status: 'pending',
        priority: 'urgent',
        assigned_to: assigneeResult[0].id,
        due_date: dueDate
      })
      .returning()
      .execute();

    const result = await updateWorkflowTaskStatus(taskWithAllFieldsResult[0].id, 'approved');

    expect(result.status).toEqual('approved');
    expect(result.title).toEqual('Complex Task');
    expect(result.description).toEqual('Task with all fields');
    expect(result.priority).toEqual('urgent');
    expect(result.assigned_to).toEqual(assigneeResult[0].id);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date?.getTime()).toEqual(dueDate.getTime());
    expect(result.user_id).toEqual(testUserId);
    expect(result.campaign_id).toEqual(testCampaignId);
    expect(result.content_id).toEqual(testContentId);
  });
});