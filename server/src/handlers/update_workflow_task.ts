import { db } from '../db';
import { workflowTasksTable } from '../db/schema';
import { type WorkflowTask, type WorkflowStatus } from '../schema';
import { eq } from 'drizzle-orm';

export const updateWorkflowTaskStatus = async (taskId: number, status: WorkflowStatus): Promise<WorkflowTask> => {
  try {
    // First check if the task exists
    const existingTasks = await db.select()
      .from(workflowTasksTable)
      .where(eq(workflowTasksTable.id, taskId))
      .execute();

    if (existingTasks.length === 0) {
      throw new Error(`Workflow task with id ${taskId} not found`);
    }

    // Update the task status and set completed_at if status is 'completed'
    const updateData: any = {
      status: status,
      updated_at: new Date()
    };

    // Set completed_at when status is 'completed', clear it otherwise
    if (status === 'completed') {
      updateData.completed_at = new Date();
    } else {
      updateData.completed_at = null;
    }

    const result = await db.update(workflowTasksTable)
      .set(updateData)
      .where(eq(workflowTasksTable.id, taskId))
      .returning()
      .execute();

    const updatedTask = result[0];
    
    return updatedTask;
  } catch (error) {
    console.error('Workflow task status update failed:', error);
    throw error;
  }
};