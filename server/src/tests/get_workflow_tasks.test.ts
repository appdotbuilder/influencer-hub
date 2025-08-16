import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowTasksTable, campaignsTable, contentTable } from '../db/schema';
import { getWorkflowTasksByUser } from '../handlers/get_workflow_tasks';
import { eq } from 'drizzle-orm';

describe('getWorkflowTasksByUser', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testUser1: { id: number };
    let testUser2: { id: number };
    let testUser3: { id: number };
    let testCampaign: { id: number };
    let testContent: { id: number };

    beforeEach(async () => {
        // Create test users
        const users = await db.insert(usersTable)
            .values([
                {
                    email: 'user1@test.com',
                    username: 'user1',
                    full_name: 'User One'
                },
                {
                    email: 'user2@test.com',
                    username: 'user2',
                    full_name: 'User Two'
                },
                {
                    email: 'user3@test.com',
                    username: 'user3',
                    full_name: 'User Three'
                }
            ])
            .returning({ id: usersTable.id })
            .execute();

        testUser1 = users[0];
        testUser2 = users[1];
        testUser3 = users[2];

        // Create test campaign
        const campaigns = await db.insert(campaignsTable)
            .values({
                user_id: testUser1.id,
                name: 'Test Campaign',
                start_date: new Date(),
                target_platforms: ['instagram', 'tiktok']
            })
            .returning({ id: campaignsTable.id })
            .execute();

        testCampaign = campaigns[0];

        // Create test content
        const content = await db.insert(contentTable)
            .values({
                user_id: testUser1.id,
                title: 'Test Content',
                content_type: 'post'
            })
            .returning({ id: contentTable.id })
            .execute();

        testContent = content[0];
    });

    it('should return tasks created by user', async () => {
        // Create tasks for user1
        await db.insert(workflowTasksTable)
            .values([
                {
                    user_id: testUser1.id,
                    title: 'Task 1',
                    priority: 'medium',
                    campaign_id: testCampaign.id
                },
                {
                    user_id: testUser1.id,
                    title: 'Task 2',
                    priority: 'high',
                    content_id: testContent.id
                }
            ])
            .execute();

        // Create task for user2
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser2.id,
                title: 'Task 3',
                priority: 'low'
            })
            .execute();

        const results = await getWorkflowTasksByUser(testUser1.id);

        expect(results).toHaveLength(2);
        expect(results[0].title).toEqual('Task 1');
        expect(results[0].user_id).toEqual(testUser1.id);
        expect(results[0].priority).toEqual('medium');
        expect(results[0].campaign_id).toEqual(testCampaign.id);
        expect(results[0].created_at).toBeInstanceOf(Date);
        expect(results[0].updated_at).toBeInstanceOf(Date);

        expect(results[1].title).toEqual('Task 2');
        expect(results[1].user_id).toEqual(testUser1.id);
        expect(results[1].priority).toEqual('high');
        expect(results[1].content_id).toEqual(testContent.id);
    });

    it('should return tasks assigned to user', async () => {
        // Create task assigned to user1 but created by user2
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser2.id,
                assigned_to: testUser1.id,
                title: 'Assigned Task',
                priority: 'urgent'
            })
            .execute();

        const results = await getWorkflowTasksByUser(testUser1.id);

        expect(results).toHaveLength(1);
        expect(results[0].title).toEqual('Assigned Task');
        expect(results[0].user_id).toEqual(testUser2.id);
        expect(results[0].assigned_to).toEqual(testUser1.id);
        expect(results[0].priority).toEqual('urgent');
    });

    it('should return both created and assigned tasks by default', async () => {
        // Create task by user1
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser1.id,
                title: 'Created Task',
                priority: 'medium'
            })
            .execute();

        // Create task assigned to user1
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser2.id,
                assigned_to: testUser1.id,
                title: 'Assigned Task',
                priority: 'high'
            })
            .execute();

        // Create task not related to user1
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser3.id,
                title: 'Other Task',
                priority: 'low'
            })
            .execute();

        const results = await getWorkflowTasksByUser(testUser1.id);

        expect(results).toHaveLength(2);
        
        const createdTask = results.find(t => t.title === 'Created Task');
        const assignedTask = results.find(t => t.title === 'Assigned Task');
        
        expect(createdTask).toBeDefined();
        expect(createdTask?.user_id).toEqual(testUser1.id);
        expect(createdTask?.assigned_to).toBeNull();
        
        expect(assignedTask).toBeDefined();
        expect(assignedTask?.user_id).toEqual(testUser2.id);
        expect(assignedTask?.assigned_to).toEqual(testUser1.id);
    });

    it('should filter by status', async () => {
        await db.insert(workflowTasksTable)
            .values([
                {
                    user_id: testUser1.id,
                    title: 'Pending Task',
                    priority: 'medium',
                    status: 'pending'
                },
                {
                    user_id: testUser1.id,
                    title: 'Approved Task',
                    priority: 'high',
                    status: 'approved'
                },
                {
                    user_id: testUser1.id,
                    title: 'Completed Task',
                    priority: 'low',
                    status: 'completed'
                }
            ])
            .execute();

        const pendingResults = await getWorkflowTasksByUser(testUser1.id, 'pending');
        expect(pendingResults).toHaveLength(1);
        expect(pendingResults[0].title).toEqual('Pending Task');
        expect(pendingResults[0].status).toEqual('pending');

        const approvedResults = await getWorkflowTasksByUser(testUser1.id, 'approved');
        expect(approvedResults).toHaveLength(1);
        expect(approvedResults[0].title).toEqual('Approved Task');
        expect(approvedResults[0].status).toEqual('approved');
    });

    it('should filter by priority', async () => {
        await db.insert(workflowTasksTable)
            .values([
                {
                    user_id: testUser1.id,
                    title: 'Low Priority Task',
                    priority: 'low'
                },
                {
                    user_id: testUser1.id,
                    title: 'High Priority Task',
                    priority: 'high'
                },
                {
                    user_id: testUser1.id,
                    title: 'Urgent Task',
                    priority: 'urgent'
                }
            ])
            .execute();

        const highResults = await getWorkflowTasksByUser(testUser1.id, undefined, 'high');
        expect(highResults).toHaveLength(1);
        expect(highResults[0].title).toEqual('High Priority Task');
        expect(highResults[0].priority).toEqual('high');

        const urgentResults = await getWorkflowTasksByUser(testUser1.id, undefined, 'urgent');
        expect(urgentResults).toHaveLength(1);
        expect(urgentResults[0].title).toEqual('Urgent Task');
        expect(urgentResults[0].priority).toEqual('urgent');
    });

    it('should filter by assignedToMe flag', async () => {
        // Create task by user1 (not assigned)
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser1.id,
                title: 'Created Task',
                priority: 'medium'
            })
            .execute();

        // Create task assigned to user1
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser2.id,
                assigned_to: testUser1.id,
                title: 'Assigned Task',
                priority: 'high'
            })
            .execute();

        // Test assignedToMe = true (only assigned tasks)
        const assignedResults = await getWorkflowTasksByUser(testUser1.id, undefined, undefined, true);
        expect(assignedResults).toHaveLength(1);
        expect(assignedResults[0].title).toEqual('Assigned Task');
        expect(assignedResults[0].assigned_to).toEqual(testUser1.id);

        // Test assignedToMe = false (only created tasks)
        const createdResults = await getWorkflowTasksByUser(testUser1.id, undefined, undefined, false);
        expect(createdResults).toHaveLength(1);
        expect(createdResults[0].title).toEqual('Created Task');
        expect(createdResults[0].user_id).toEqual(testUser1.id);
        expect(createdResults[0].assigned_to).toBeNull();
    });

    it('should combine multiple filters', async () => {
        await db.insert(workflowTasksTable)
            .values([
                {
                    user_id: testUser1.id,
                    title: 'High Priority Pending Task',
                    priority: 'high',
                    status: 'pending'
                },
                {
                    user_id: testUser1.id,
                    title: 'High Priority Approved Task',
                    priority: 'high',
                    status: 'approved'
                },
                {
                    user_id: testUser1.id,
                    title: 'Low Priority Pending Task',
                    priority: 'low',
                    status: 'pending'
                },
                {
                    user_id: testUser2.id,
                    assigned_to: testUser1.id,
                    title: 'Assigned High Priority Pending Task',
                    priority: 'high',
                    status: 'pending'
                }
            ])
            .execute();

        // Filter for high priority, pending tasks, only created by user
        const results = await getWorkflowTasksByUser(testUser1.id, 'pending', 'high', false);
        expect(results).toHaveLength(1);
        expect(results[0].title).toEqual('High Priority Pending Task');
        expect(results[0].priority).toEqual('high');
        expect(results[0].status).toEqual('pending');
        expect(results[0].user_id).toEqual(testUser1.id);
        expect(results[0].assigned_to).toBeNull();
    });

    it('should handle date fields correctly', async () => {
        const dueDate = new Date('2024-12-31');
        const completedDate = new Date('2024-01-15');

        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser1.id,
                title: 'Task with Dates',
                priority: 'medium',
                status: 'completed',
                due_date: dueDate,
                completed_at: completedDate
            })
            .execute();

        const results = await getWorkflowTasksByUser(testUser1.id);

        expect(results).toHaveLength(1);
        expect(results[0].due_date).toBeInstanceOf(Date);
        expect(results[0].completed_at).toBeInstanceOf(Date);
        expect(results[0].due_date?.getTime()).toEqual(dueDate.getTime());
        expect(results[0].completed_at?.getTime()).toEqual(completedDate.getTime());
        expect(results[0].created_at).toBeInstanceOf(Date);
        expect(results[0].updated_at).toBeInstanceOf(Date);
    });

    it('should return empty array when no tasks found', async () => {
        const results = await getWorkflowTasksByUser(testUser1.id);
        expect(results).toHaveLength(0);
        expect(results).toEqual([]);
    });

    it('should handle tasks with null optional fields', async () => {
        await db.insert(workflowTasksTable)
            .values({
                user_id: testUser1.id,
                title: 'Minimal Task',
                priority: 'medium'
                // All other fields should be null or have default values
            })
            .execute();

        const results = await getWorkflowTasksByUser(testUser1.id);

        expect(results).toHaveLength(1);
        expect(results[0].title).toEqual('Minimal Task');
        expect(results[0].description).toBeNull();
        expect(results[0].campaign_id).toBeNull();
        expect(results[0].content_id).toBeNull();
        expect(results[0].assigned_to).toBeNull();
        expect(results[0].due_date).toBeNull();
        expect(results[0].completed_at).toBeNull();
        expect(results[0].status).toEqual('pending'); // Default value
        expect(results[0].priority).toEqual('medium');
    });
});