import { db } from '../db';
import { workflowTasksTable } from '../db/schema';
import { type WorkflowTask, type WorkflowStatus, type PriorityLevel } from '../schema';
import { eq, and, or, type SQL } from 'drizzle-orm';

export const getWorkflowTasksByUser = async (
    userId: number,
    status?: WorkflowStatus,
    priority?: PriorityLevel,
    assignedToMe?: boolean
): Promise<WorkflowTask[]> => {
    try {
        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        // Handle user filtering based on assignedToMe flag
        if (assignedToMe === true) {
            // Only tasks assigned to this user
            conditions.push(eq(workflowTasksTable.assigned_to, userId));
        } else if (assignedToMe === false) {
            // Only tasks created by this user (but not necessarily assigned to them)
            conditions.push(eq(workflowTasksTable.user_id, userId));
        } else {
            // Default: tasks either created by OR assigned to this user
            conditions.push(
                or(
                    eq(workflowTasksTable.user_id, userId),
                    eq(workflowTasksTable.assigned_to, userId)
                )!
            );
        }

        // Add optional status filter
        if (status) {
            conditions.push(eq(workflowTasksTable.status, status));
        }

        // Add optional priority filter
        if (priority) {
            conditions.push(eq(workflowTasksTable.priority, priority));
        }

        // Build and execute query with all conditions
        const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
        const results = await db.select()
            .from(workflowTasksTable)
            .where(whereCondition)
            .execute();

        // Convert the results to match the schema types
        return results.map(task => ({
            ...task,
            // Convert dates to proper Date objects
            created_at: new Date(task.created_at),
            updated_at: new Date(task.updated_at),
            due_date: task.due_date ? new Date(task.due_date) : null,
            completed_at: task.completed_at ? new Date(task.completed_at) : null
        }));
    } catch (error) {
        console.error('Failed to fetch workflow tasks:', error);
        throw error;
    }
};